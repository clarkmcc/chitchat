use crate::config::get_models_dir;
use anyhow::Result;
use futures_util::StreamExt;
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::cmp::min;
use std::convert::Infallible;
use std::fs::create_dir_all;
use std::io::Write;
use std::path::PathBuf;
use tracing::info;

lazy_static! {
    pub(crate) static ref AVAILABLE_MODELS: Vec<Model> =
        serde_json::from_str(include_str!("../data/models.json")).unwrap();
    pub(crate) static ref AVAILABLE_ARCHITECTURES: Vec<Architecture> = vec![
        Architecture {
            name: "Llama".to_string(),
            id: "llama".to_string(),
            inner: llm::ModelArchitecture::Llama,
        },
        Architecture {
            name: "GPT-2".to_string(),
            id: "gpt2".to_string(),
            inner: llm::ModelArchitecture::Gpt2,
        },
    ];
}

#[derive(Serialize, Deserialize, Clone)]
pub(crate) struct Model {
    name: String,
    url: String,
    pub(crate) filename: String,
    pub(crate) description: String,
    pub(crate) id: String,
}

#[derive(Serialize, Clone)]
pub(crate) struct Architecture {
    name: String,
    pub(crate) id: String,
    pub(crate) inner: llm::ModelArchitecture,
}

pub(crate) struct ModelManager {
    pub(crate) model: Box<dyn llm::Model>,
    pub(crate) session: llm::InferenceSession,
}

impl ModelManager {
    pub(crate) fn infer<F>(
        &mut self,
        prompt: &str,
        mut callback: F,
    ) -> Result<llm::InferenceStats, String>
    where
        F: FnMut(String),
    {
        self.session
            .infer(
                self.model.as_ref(),
                &mut rand::thread_rng(),
                &llm::InferenceRequest {
                    prompt: prompt.into(),
                    parameters: &llm::InferenceParameters::default(),
                    play_back_previous_tokens: false,
                    maximum_token_count: None,
                },
                &mut Default::default(),
                |res| match res {
                    llm::InferenceResponse::InferredToken(t) => {
                        callback(t);
                        Ok::<llm::InferenceFeedback, Infallible>(llm::InferenceFeedback::Continue)
                    }
                    llm::InferenceResponse::SnapshotToken(t) => {
                        Ok::<llm::InferenceFeedback, Infallible>(llm::InferenceFeedback::Continue)
                    }
                    _ => Ok(llm::InferenceFeedback::Continue),
                },
            )
            .map_err(|e| format!("Error inferring: {}", e))
    }
}

#[tracing::instrument(skip(progress))]
async fn download_file<F>(
    url: &str,
    destination: &PathBuf,
    filename: &str,
    progress: F,
) -> Result<PathBuf>
where
    F: Fn(u64, u64, f32),
{
    create_dir_all(destination)?;
    let destination = destination.join(filename);
    let destination = destination.to_str().unwrap();
    info!("downloading model to {}", destination);
    let response = reqwest::get(url).await?;
    let total_size = response.content_length().unwrap_or(0);
    let mut stream = response.bytes_stream();
    let mut file = std::fs::File::create(destination)?;
    let mut downloaded: u64 = 0;
    while let Some(item) = stream.next().await {
        let chunk = item?;
        file.write_all(&chunk)?;
        let new_downloaded = min(downloaded + chunk.len() as u64, total_size);
        if total_size > 0 {
            let p = new_downloaded as f32 / total_size as f32;
            progress(downloaded, total_size, p);
        }
        downloaded = new_downloaded;
    }
    Ok(PathBuf::from(destination))
}

#[tracing::instrument(skip(progress))]
pub(crate) async fn get_local_model<F>(id: &str, progress: F) -> Result<(Model, PathBuf)>
where
    F: Fn(u64, u64, f32),
{
    let model = AVAILABLE_MODELS
        .iter()
        .find(|m| m.id == id)
        .ok_or(anyhow::anyhow!("Model not found"))?;
    let models_dir = get_models_dir()?;
    if !models_dir.join(&model.filename).exists() {
        download_file(&model.url, &models_dir, &model.filename, progress).await?;
        info!(filename = model.filename, "finished downloading model");
    }
    Ok((model.clone(), models_dir.join(&model.filename)))
}
