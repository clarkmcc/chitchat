// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg_attr(
    all(not(test), any(target_os = "windows", target_os = "linux")),
    feature(cublas)
)]
extern crate llm;

mod config;
mod events;
mod models;

mod cancellation;
mod context_file;
mod prompt;
#[cfg(target_os = "macos")]
mod titlebar;

use crate::cancellation::Canceller;
use crate::config::get_logs_dir;
use crate::events::Event;
use crate::models::{get_local_model, Architecture, Model, ModelManager};
use crate::prompt::Template;
#[cfg(target_os = "macos")]
use crate::titlebar::WindowExt;
use bytesize::ByteSize;
use llm::{InferenceResponse, LoadProgress};
use serde::Serialize;
use std::fs;
use std::fs::create_dir_all;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{Manager, Window};
use tauri_plugin_aptabase::EventTracker;
use tracing::info;
use tracing_subscriber::EnvFilter;

struct ManagerState(Mutex<Option<ModelManager>>);

#[tauri::command]
async fn get_models() -> Result<Vec<Model>, String> {
    models::get_available_models()
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
fn get_architectures() -> Vec<Architecture> {
    models::AVAILABLE_ARCHITECTURES.clone()
}

#[tauri::command]
fn get_prompt_templates() -> Vec<Template> {
    prompt::AVAILABLE_TEMPLATES.clone()
}

#[tauri::command]
async fn cancel(canceller: tauri::State<'_, Canceller>) -> Result<(), String> {
    canceller.cancel().await.map_err(|err| err.to_string())
}

#[tauri::command]
async fn start(
    window: Window,
    state: tauri::State<'_, ManagerState>,
    canceller: tauri::State<'_, Canceller>,
    model_filename: String,
    architecture: String,
    tokenizer: String,
    context_size: usize,
    use_gpu: bool,
    prompt: Template,
    context_files: Vec<String>,
) -> Result<bool, String> {
    canceller.reset();
    let context = context_files
        .iter()
        .map(|path| context_file::read(PathBuf::from(path)))
        .collect::<Result<Vec<_>, _>>()
        .map_err(|err| err.to_string())?
        .join("\n");

    let warmup_prompt = if !context.is_empty() {
        format!("{}\n{}", context, prompt.warmup)
    } else {
        prompt.warmup.clone()
    };

    let path = get_local_model(&model_filename, |downloaded, total, progress| {
        let message = format!(
            "Downloading model ({} / {})",
            ByteSize(downloaded),
            ByteSize(total)
        );
        Event::ModelLoading { message, progress }.send(&window);
    })
    .await
    .map_err(|err| err.to_string())?;
    let architecture = models::AVAILABLE_ARCHITECTURES
        .iter()
        .find(|v| *v.id == architecture)
        .ok_or("Architecture not found")?;
    let tokenizer = match tokenizer.as_str() {
        "embedded" => llm::TokenizerSource::Embedded,
        _ => return Err("Tokenizer not supported".to_string()),
    };

    info!(
        gpu = use_gpu,
        model = path.to_str().unwrap_or_default(),
        "starting model"
    );

    let params = llm::ModelParameters {
        use_gpu,
        context_size,
        ..Default::default()
    };
    let model = llm::load_dynamic(
        Some(architecture.inner),
        path.as_path(),
        tokenizer,
        params,
        |progress| match progress {
            LoadProgress::HyperparametersLoaded => Event::ModelLoading {
                message: "Hyper-parameters loaded".to_string(),
                progress: 0.05,
            }
            .send(&window),
            LoadProgress::ContextSize { .. } => Event::ModelLoading {
                message: "Context created".to_string(),
                progress: 0.1,
            }
            .send(&window),
            LoadProgress::LoraApplied { .. } => Event::ModelLoading {
                message: "LoRA applied".to_string(),
                progress: 0.15,
            }
            .send(&window),
            LoadProgress::TensorLoaded {
                current_tensor,
                tensor_count,
            } => {
                // Once we start loading tensors, we're at 20%, once we're finished, we're at 50%
                // and intermediate tensor loads should be linearly interpolated.
                let start = 0.2;
                let end = 0.5;
                let progress =
                    start + (end - start) * (current_tensor as f32 / tensor_count as f32);
                Event::ModelLoading {
                    message: format!("Loading tensor {}/{}", current_tensor, tensor_count),
                    progress,
                }
                .send(&window)
            }
            LoadProgress::Loaded { .. } => Event::ModelLoading {
                message: "Model loaded".to_string(),
                progress: 0.6,
            }
            .send(&window),
        },
    )
    .map_err(|e| format!("Error loading model: {}", e))?;

    let mut session = model.start_session(Default::default());

    // When you feed a prompt, progress is going to be determined by how far
    // through repeating the warmup prompt we are.
    let mut progress_length = 0;
    session
        .feed_prompt(
            model.as_ref(),
            warmup_prompt.as_str(),
            &mut Default::default(),
            llm::feed_prompt_callback(|res| match res {
                InferenceResponse::PromptToken(t) => {
                    progress_length += t.len();
                    let progress = progress_length as f32 / warmup_prompt.len() as f32;
                    Event::ModelLoading {
                        message: format!("Warming up model ({:.0}%)", progress * 100.0),
                        progress,
                    }
                    .send(&window);
                    canceller.inference_feedback()
                }
                _ => canceller.inference_feedback(),
            }),
        )
        .map_err(|e| format!("Error feeding prompt: {}", e))?;
    Event::ModelLoading {
        message: "Model loaded".to_string(),
        progress: 1.0,
    }
    .send(&window);

    if canceller.is_cancelled() {
        return Ok(false);
    }

    info!("finished warm-up prompt");
    *state.0.lock().unwrap() = Some(ModelManager {
        model,
        session,
        template: prompt,
    });

    Ok(true)
}

#[derive(Serialize)]
pub struct PromptResponse {
    pub stats: llm::InferenceStats,
    pub message: String,
}

#[tracing::instrument(skip(window, state, canceller, message))]
#[tauri::command]
async fn prompt(
    window: Window,
    state: tauri::State<'_, ManagerState>,
    canceller: tauri::State<'_, Canceller>,
    message: String,
) -> Result<PromptResponse, String> {
    info!("received prompt");

    let mut binding = state
        .0
        .lock()
        .map_err(|e| format!("Unable to lock the backend: {e}"))?;
    let manager: &mut ModelManager = (*binding).as_mut().ok_or("Model not started".to_string())?;
    let mut response = String::new();

    let stats = manager.infer(&message, |res| match res {
        InferenceResponse::InferredToken(tokens) => {
            response.push_str(&tokens);
            Event::PromptResponse { message: tokens }.send(&window);
            canceller.inference_feedback()
        }
        _ => canceller.inference_feedback(),
    })?;

    info!("finished prompt response");
    Event::PromptResponse {
        message: Default::default(),
    }
    .send(&window);

    Ok(PromptResponse {
        stats,
        message: response.replace(&message, "").trim().to_string(),
    })
}

fn main() {
    let log_file_path = get_logs_dir().expect("getting log directory");
    create_dir_all(&log_file_path).expect("creating log directory");
    let log_file = fs::File::create(log_file_path.join("app.log")).expect("creating log file");
    let (non_blocking, _guard) = tracing_appender::non_blocking(log_file);
    tracing_subscriber::fmt()
        .json()
        .with_env_filter(EnvFilter::from_default_env())
        .with_writer(non_blocking)
        .init();

    info!("starting...");

    let builder = tauri::Builder::default()
        .setup(|app| {
            let win = app.get_window("main").unwrap();

            #[cfg(feature = "analytics")]
            app.track_event("app_started", None);

            #[cfg(target_os = "macos")]
            win.set_transparent_titlebar(true, false);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start,
            get_models,
            get_architectures,
            get_prompt_templates,
            prompt,
            cancel,
        ])
        .manage(ManagerState(Mutex::new(None)))
        .manage(Canceller::default());

    // #[cfg(feature = "analytics")]
    // let panic_hook = tauri_plugin_aptabase::Builder::new(env!("APTABASE_KEY"))
    //     .with_panic_hook(Box::new(|client, info| {
    //         client.track_event("panic", Some(json!({})));
    //     }))
    //     .build();
    // #[cfg(feature = "analytics")]
    // let builder = builder.plugin(panic_hook);

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
