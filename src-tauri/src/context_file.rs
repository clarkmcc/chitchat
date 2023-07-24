use anyhow::Result;
use std::path::PathBuf;
use tracing::info;

#[tracing::instrument]
pub fn open_file(path: PathBuf) -> Result<String> {
    let extension = path
        .extension()
        .ok_or(anyhow::anyhow!("Could not determine file extension"))?
        .to_str()
        .ok_or(anyhow::anyhow!(
            "Could not convert file extension to string"
        ))?;
    info!(extension = extension, "opening context file");
    match extension {
        "txt" => std::fs::read_to_string(path).map_err(|err| err.into()),
        "pdf" => {
            let bytes = std::fs::read(path)?;
            pdf_extract::extract_text_from_mem(&bytes).map_err(|err| err.into())
        }
        _ => Err(anyhow::anyhow!("Unsupported file extension {}", extension)),
    }
}
