use anyhow::Result;
use home::home_dir;
use std::fs::create_dir_all;
use std::path::PathBuf;

pub fn get_app_dir() -> Result<PathBuf> {
    Ok(home_dir()
        .ok_or(anyhow::anyhow!("Could not find home directory"))?
        .join(".chitchat"))
}

pub fn get_models_dir() -> Result<PathBuf> {
    let dir = get_app_dir()?.join("models");
    create_dir_all(&dir)?;
    Ok(dir)
}

pub fn get_logs_dir() -> Result<PathBuf> {
    let dir = get_app_dir()?.join("logs");
    create_dir_all(&dir)?;
    Ok(dir)
}
