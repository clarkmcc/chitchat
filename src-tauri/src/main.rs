// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
mod events;
mod models;

use crate::config::get_logs_dir;
use crate::models::{get_local_model, Architecture, Model, ModelManager};
use bytesize::ByteSize;
use llm::{InferenceResponse, LoadProgress};
use serde::{Deserialize, Serialize};
use std::convert::Infallible;
use std::fs;
use std::fs::create_dir_all;
use std::sync::Mutex;
use tauri::Manager;
use tracing::info;
use tracing_subscriber::EnvFilter;

struct ManagerState(Mutex<Option<ModelManager>>);

#[derive(Deserialize, Debug)]
struct Message {
    subject: String,
    message: String,
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_models() -> Vec<Model> {
    models::AVAILABLE_MODELS.clone()
}

#[tauri::command]
fn get_architectures() -> Vec<Architecture> {
    models::AVAILABLE_ARCHITECTURES.clone()
}

#[tauri::command]
async fn start(
    window: Window,
    mut state: tauri::State<'_, ManagerState>,
    model: String,
    architecture: String,
    tokenizer: String,
    context_size: usize,
    use_gpu: bool,
    warmup_prompt: String,
) -> Result<(), String> {
    let (model, path) = get_local_model(&model, |downloaded, total, progress| {
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

    info!(gpu = use_gpu, model = model.id, "starting model");

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

    let mut response = String::new();
    let mut progress = 0.6;
    let mut session = model.start_session(Default::default());
    session
        .feed_prompt(
            model.as_ref(),
            warmup_prompt.as_str(),
            &mut Default::default(),
            llm::feed_prompt_callback(|res| match res {
                InferenceResponse::PromptToken(t) | InferenceResponse::InferredToken(t) => {
                    response.push_str(&t);
                    if progress < 0.99 {
                        progress += 0.001;
                    }
                    Event::ModelLoading {
                        message: format!("Warming up model ({:.2}%)", progress * 100.0),
                        progress,
                    }
                    .send(&window);
                    Ok::<llm::InferenceFeedback, Infallible>(llm::InferenceFeedback::Continue)
                }
                _ => Ok(llm::InferenceFeedback::Continue),
            }),
        )
        .map_err(|e| format!("Error feeding prompt: {}", e))?;

    info!(response = response, "finished warm-up prompt");

    *state.0.lock().unwrap() = Some(ModelManager { model, session });

    Event::ModelLoading {
        message: "Model loaded".to_string(),
        progress: 1.0,
    }
    .send(&window);

    Ok(())
}

#[derive(Serialize)]
pub struct PromptResponse {
    pub stats: llm::InferenceStats,
    pub message: String,
}

#[tracing::instrument(skip(window, state, message))]
#[tauri::command]
async fn prompt(
    window: Window,
    state: tauri::State<'_, ManagerState>,
    message: String,
) -> Result<PromptResponse, String> {
    info!("received prompt");

    let mut binding = state.0.lock().unwrap();
    let manager: &mut ModelManager = (*binding).as_mut().unwrap();
    let message = format!("USER: {}\nSYSTEM: ", message);
    let mut response = String::new();

    let stats = manager.infer(&message, |tokens| {
        response.push_str(&tokens);
        Event::PromptResponse { message: tokens }.send(&window);
    })?;

    info!("finished prompt response");
    Event::PromptResponse {
        message: Default::default(),
    }
    .send(&window);
    Ok(PromptResponse {
        stats,
        message: response.replace(&message, ""),
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
            #[cfg(feature = "analytics")]
            app.track_event("app_started", None);
            let win = app.get_window("main").unwrap();
            #[cfg(debug_assertions)] // only include this code on debug builds
            {
                // window.open_devtools();
                // window.close_devtools();
            }
            win.set_transparent_titlebar(true, false);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            start,
            get_models,
            get_architectures,
            prompt,
        ])
        .manage(ManagerState(Mutex::new(None)));

    #[cfg(feature = "analytics")]
    let panic_hook = tauri_plugin_aptabase::Builder::new(env!("APTABASE_KEY"))
        .with_panic_hook(Box::new(|client, info| {
            client.track_event(
                "panic",
                Some(json!({
                    // "build_timestamp": env!("VERGEN_BUILD_TIMESTAMP"),
                })),
            );
        }))
        .build();
    #[cfg(feature = "analytics")]
    let builder = builder.plugin(panic_hook);

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

use crate::events::Event;
#[cfg(target_os = "macos")]
use cocoa::appkit::{NSWindow, NSWindowStyleMask, NSWindowTitleVisibility};
use serde_json::json;
#[cfg(target_os = "macos")]
use tauri::{Runtime, Window};
#[cfg(target_os = "macos")]
use tauri_plugin_aptabase::EventTracker;

pub trait WindowExt {
    #[cfg(target_os = "macos")]
    fn set_transparent_titlebar(&self, title_transparent: bool, remove_toolbar: bool);
}

impl<R: Runtime> WindowExt for Window<R> {
    #[cfg(target_os = "macos")]
    fn set_transparent_titlebar(&self, title_transparent: bool, remove_tool_bar: bool) {
        unsafe {
            let id = self.ns_window().unwrap() as cocoa::base::id;
            NSWindow::setTitlebarAppearsTransparent_(id, cocoa::base::YES);
            let mut style_mask = id.styleMask();
            style_mask.set(
                NSWindowStyleMask::NSFullSizeContentViewWindowMask,
                title_transparent,
            );

            if remove_tool_bar {
                style_mask.remove(
                    NSWindowStyleMask::NSClosableWindowMask
                        | NSWindowStyleMask::NSMiniaturizableWindowMask
                        | NSWindowStyleMask::NSResizableWindowMask,
                );
            }

            id.setStyleMask_(style_mask);
            id.setMovable_(cocoa::base::YES);
            id.setMovableByWindowBackground_(cocoa::base::YES);

            id.setTitleVisibility_(if title_transparent {
                NSWindowTitleVisibility::NSWindowTitleHidden
            } else {
                NSWindowTitleVisibility::NSWindowTitleVisible
            });

            id.setTitlebarAppearsTransparent_(if title_transparent {
                cocoa::base::YES
            } else {
                cocoa::base::NO
            });
        }
    }
}
