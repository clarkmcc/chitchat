// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
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

#[derive(Serialize, Clone, Debug)]
struct ModelLoadEvent {
    message: String,
    progress: f32,
}

#[derive(Serialize, Clone, Debug)]
struct PromptResponseEvent {
    message: String,
    done: bool,
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
        window
            .emit(
                "model_loading",
                ModelLoadEvent {
                    message: format!(
                        "Downloading model ({} / {})",
                        ByteSize(downloaded),
                        ByteSize(total)
                    ),
                    progress,
                },
            )
            .unwrap()
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
            LoadProgress::HyperparametersLoaded => {
                window
                    .emit(
                        "model_loading",
                        ModelLoadEvent {
                            message: "Hyperparameters loaded".to_string(),
                            progress: 0.05,
                        },
                    )
                    .unwrap();
            }
            LoadProgress::ContextSize { .. } => {
                window
                    .emit(
                        "model_loading",
                        ModelLoadEvent {
                            message: "Context created".to_string(),
                            progress: 0.1,
                        },
                    )
                    .unwrap();
            }
            LoadProgress::LoraApplied { .. } => window
                .emit(
                    "model_loading",
                    ModelLoadEvent {
                        message: "LoRA applied".to_string(),
                        progress: 0.2,
                    },
                )
                .unwrap(),
            LoadProgress::TensorLoaded {
                current_tensor,
                tensor_count,
            } => {
                let progress = 0.2 + 0.3 * (current_tensor as f32 / tensor_count as f32);
                window
                    .emit(
                        "model_loading",
                        ModelLoadEvent {
                            message: "Context created".to_string(),
                            progress,
                        },
                    )
                    .unwrap();
            }
            LoadProgress::Loaded { .. } => window
                .emit(
                    "model_loading",
                    ModelLoadEvent {
                        message: "Model loaded".to_string(),
                        progress: 0.6,
                    },
                )
                .unwrap(),
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
                    window
                        .emit(
                            "model_loading",
                            ModelLoadEvent {
                                message: "Warming up the model".to_string(),
                                progress,
                            },
                        )
                        .unwrap();

                    Ok::<llm::InferenceFeedback, Infallible>(llm::InferenceFeedback::Continue)
                }
                _ => Ok(llm::InferenceFeedback::Continue),
            }),
        )
        .map_err(|e| format!("Error feeding prompt: {}", e))?;

    info!(response = response, "finished warm-up prompt");

    *state.0.lock().unwrap() = Some(ModelManager { model, session });

    window
        .emit(
            "model_loading",
            ModelLoadEvent {
                message: "Finished".to_string(),
                progress: 1.0,
            },
        )
        .unwrap();

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
    mut state: tauri::State<'_, ManagerState>,
    message: String,
) -> Result<PromptResponse, String> {
    info!("received prompt");

    let mut binding = state.0.lock().unwrap();
    let manager = (*binding).as_mut().unwrap();
    let mut response = String::new();
    let message = format!("USER: {}\nSYSTEM: ", message);
    let stats = manager
        .session
        .infer(
            manager.model.as_ref(),
            &mut rand::thread_rng(),
            &llm::InferenceRequest {
                prompt: message.as_str().into(),
                parameters: &llm::InferenceParameters::default(),
                play_back_previous_tokens: false,
                maximum_token_count: None,
            },
            &mut Default::default(),
            |res| match res {
                InferenceResponse::InferredToken(t) => {
                    response.push_str(&t);
                    window
                        .emit(
                            "prompt_response",
                            PromptResponseEvent {
                                message: t,
                                done: false,
                            },
                        )
                        .unwrap();
                    Ok::<llm::InferenceFeedback, Infallible>(llm::InferenceFeedback::Continue)
                }
                InferenceResponse::SnapshotToken(t) => {
                    println!("Snapshot: {}", t);
                    Ok::<llm::InferenceFeedback, Infallible>(llm::InferenceFeedback::Continue)
                }
                _ => Ok(llm::InferenceFeedback::Continue),
            },
        )
        .map_err(|e| format!("Error inferring: {}", e))?;

    info!(response = response, "prompt response");
    window
        .emit(
            "prompt_response",
            PromptResponseEvent {
                message: String::default(),
                done: true,
            },
        )
        .unwrap();

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
    tauri::Builder::default()
        .setup(|app| {
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
        .manage(ManagerState(Mutex::new(None)))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(target_os = "macos")]
use cocoa::appkit::{NSWindow, NSWindowStyleMask, NSWindowTitleVisibility};
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
