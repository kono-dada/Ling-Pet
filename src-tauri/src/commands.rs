use crate::sbv2_manager::Sbv2Manager;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt; // for creation_flags
use std::path::PathBuf;
use std::process::{Command, Stdio};
use tauri::Manager;
use tauri::State;
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
pub fn quit_app(app: tauri::AppHandle) -> Result<(), String> {
    // Best-effort stop before quitting
    let state: State<Sbv2Manager> = app.state();
    if let Ok(mut guard) = state.child.lock() {
        if let Some(mut child) = guard.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
    app.exit(0);
    Ok(())
}

#[tauri::command]
pub async fn open_data_folder(app: tauri::AppHandle) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| {
        let error_msg = format!("Failed to get app data directory: {}", e);
        error_msg
    })?;

    // Create the directory if it doesn't exist
    if !app_data_dir.exists() {
        std::fs::create_dir_all(&app_data_dir).map_err(|e| {
            let error_msg = format!("Failed to create app data directory: {}", e);
            error_msg
        })?;
    }

    // Try different approaches to open the folder
    let opener = app.opener();

    // Try method 1: reveal_item_in_dir (shows the folder in file explorer)
    opener
        .reveal_item_in_dir(&app_data_dir)
        .expect("Failed to reveal item in directory");

    Ok(())
}

#[tauri::command]
pub async fn sbv2_start(state: State<'_, Sbv2Manager>, install_path: String) -> Result<(), String> {
    let mut guard = state
        .child
        .lock()
        .map_err(|_| "failed to lock process state".to_string())?;
    if Sbv2Manager::is_running_inner(&mut guard) {
        return Ok(());
    }

    let install_dir = PathBuf::from(&install_path);
    if !install_dir.is_dir() {
        return Err("invalid install path".into());
    }

    // Determine executable name by target OS
    #[cfg(target_os = "windows")]
    let exe_name = "sbv2_api.exe";
    #[cfg(not(target_os = "windows"))]
    let exe_name = "sbv2_api";

    let exec_path = install_dir.join(exe_name);
    if !exec_path.exists() {
        return Err(format!(
            "sbv2 executable not found at {}",
            exec_path.display()
        ));
    }

    let mut cmd = Command::new(&exec_path);
    cmd.current_dir(&install_dir)
        .env("RUST_LOG", "info")
        .env("BERT_MODEL_PATH", "deberta.onnx")
        .env("MODELS_PATH", ".")
        .env("TOKENIZER_PATH", "tokenizer.json")
        .env("ADDR", "localhost:23456")
        .env("HOLDER_MAX_LOADED_MODELS", "20")
        .env("AGPL_DICT_PATH", "all.bin")
        // keep stdio quiet but attached so we can kill properly
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());

    // On Windows, prevent a console window from flashing when launching the child
    // 0x08000000 = CREATE_NO_WINDOW
    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(0x08000000);
    }

    let child = cmd.spawn().map_err(|e| format!("spawn failed: {}", e))?;
    *guard = Some(child);
    Ok(())
}

#[tauri::command]
pub async fn sbv2_stop(state: State<'_, Sbv2Manager>) -> Result<(), String> {
    let mut guard = state
        .child
        .lock()
        .map_err(|_| "failed to lock process state".to_string())?;
    if let Some(mut child) = guard.take() {
        let _ = child.kill();
        let _ = child.wait();
    }
    Ok(())
}

#[derive(serde::Serialize, Default)]
pub struct Sbv2Status {
    running: bool,
    pid: Option<u32>,
}

#[tauri::command]
pub async fn sbv2_status(state: State<'_, Sbv2Manager>) -> Result<Sbv2Status, String> {
    let mut guard = state
        .child
        .lock()
        .map_err(|_| "failed to lock process state".to_string())?;
    let running = Sbv2Manager::is_running_inner(&mut guard);
    let pid = guard.as_ref().map(|c| c.id());
    Ok(Sbv2Status { running, pid })
}
