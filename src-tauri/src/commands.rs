use crate::sbv2_manager::Sbv2Manager;
use crate::uiohook_manager::{UiohookManager, GlobalMouseEvent};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt; // for creation_flags
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex, mpsc::Receiver};
use tauri::{Manager, WebviewWindow};
use tauri::State;
use tauri_plugin_opener::OpenerExt;
use log::{debug, info, warn};

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
        .env("SBV2_FORCE_STEREO", "true")
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

// ==================== UIohook全局监听状态管理 ====================

/// UIohook全局监听状态管理
pub struct UiohookState {
    manager: Arc<Mutex<UiohookManager>>,
    event_receiver: Arc<Mutex<Option<Receiver<GlobalMouseEvent>>>>,
}

impl UiohookState {
    pub fn new() -> Self {
        Self {
            manager: Arc::new(Mutex::new(UiohookManager::new())),
            event_receiver: Arc::new(Mutex::new(None)),
        }
    }
}

// ==================== 窗口透过控制命令 ====================

/// 设置窗口透明度（允许事件穿透）
#[tauri::command]
pub async fn set_window_click_through(
    window: WebviewWindow,
    click_through: bool
) -> Result<(), String> {
    info!("设置窗口点击穿透: {}", click_through);
    
    window.set_ignore_cursor_events(click_through)
        .map_err(|e| format!("设置窗口点击穿透失败: {}", e))?;
    
    debug!("窗口点击穿透设置成功: {}", click_through);
    Ok(())
}

// ==================== UIohook相关命令 ====================

/// 启动UIohook全局鼠标监听
#[tauri::command]
pub async fn start_uiohook_monitoring(
    state: State<'_, UiohookState>
) -> Result<(), String> {
    info!("🚀 启动UIohook全局鼠标监听");
    
    let mut manager = state.manager.lock().map_err(|_| "无法锁定UIohook管理器".to_string())?;
    
    if manager.is_running() {
        warn!("UIohook监听已经在运行中");
        return Ok(());
    }
    
    let receiver = manager.start_global_mouse_monitoring()?;
    
    // 存储接收器
    let mut event_receiver = state.event_receiver.lock().map_err(|_| "无法锁定事件接收器".to_string())?;
    *event_receiver = Some(receiver);
    
    info!("✅ UIohook全局鼠标监听启动成功");
    Ok(())
}

/// 停止UIohook全局鼠标监听
#[tauri::command]
pub async fn stop_uiohook_monitoring(
    state: State<'_, UiohookState>
) -> Result<(), String> {
    info!("🛑 停止UIohook全局鼠标监听");
    
    let mut manager = state.manager.lock().map_err(|_| "无法锁定UIohook管理器".to_string())?;
    
    manager.stop_global_mouse_monitoring()?;
    
    // 清理接收器
    let mut event_receiver = state.event_receiver.lock().map_err(|_| "无法锁定事件接收器".to_string())?;
    *event_receiver = None;
    
    info!("✅ UIohook全局鼠标监听已停止");
    Ok(())
}

/// 轮询UIohook全局鼠标事件
#[tauri::command]
pub async fn poll_uiohook_events(
    state: State<'_, UiohookState>
) -> Result<Vec<GlobalMouseEvent>, String> {
    let mut events = Vec::new();
    
    let event_receiver = state.event_receiver.lock().map_err(|_| "无法锁定事件接收器".to_string())?;
    
    if let Some(receiver) = event_receiver.as_ref() {
        // 非阻塞轮询事件
        while let Ok(event) = receiver.try_recv() {
            info!("🖱️ UIohook事件轮询: {} 在位置 ({}, {}) {}",
                  event.button, event.x, event.y,
                  if event.is_over_pet { "【在桌宠上】" } else { "【不在桌宠上】" });
            events.push(event);
        }
    } else {
        debug!("UIohook事件接收器未初始化");
    }
    
    if !events.is_empty() {
        info!("🔄 本次UIohook轮询处理 {} 个事件", events.len());
    }
    
    Ok(events)
}

/// 更新桌宠窗口边界信息
#[tauri::command]
pub async fn update_pet_window_bounds(
    state: State<'_, UiohookState>,
    x: i32,
    y: i32,
    width: i32,
    height: i32
) -> Result<(), String> {
    info!("📐 更新桌宠窗口边界: ({}, {}) {}x{}", x, y, width, height);
    
    let manager = state.manager.lock().map_err(|_| "无法锁定UIohook管理器".to_string())?;
    manager.update_pet_window_bounds(x, y, width, height)?;
    
    debug!("✅ 桌宠窗口边界更新成功");
    Ok(())
}

/// 获取当前鼠标位置（UIohook版本）
#[tauri::command]
pub async fn get_current_mouse_position(
    state: State<'_, UiohookState>
) -> Result<(i32, i32), String> {
    let manager = state.manager.lock().map_err(|_| "无法锁定UIohook管理器".to_string())?;
    let position = manager.get_current_mouse_position()?;
    debug!("📍 当前鼠标位置: ({}, {})", position.0, position.1);
    Ok(position)
}