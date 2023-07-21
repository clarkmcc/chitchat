use std::path::PathBuf;
use anyhow::Result;
use home::home_dir;

pub fn get_app_dir() -> Result<PathBuf> {
    Ok(home_dir()
        .ok_or(anyhow::anyhow!("Could not find home directory"))?
        .join(".chitchat"))
}

pub fn get_models_dir() -> Result<PathBuf> {
    Ok(get_app_dir()?.join("models"))
}

pub fn get_logs_dir() -> Result<PathBuf> {
    Ok(get_app_dir()?.join("logs"))
}
