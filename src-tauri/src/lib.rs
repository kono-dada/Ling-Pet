// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Manager;

mod commands;
mod os;
use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Debug)
                .build(),
        )
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_pinia::init())
        .invoke_handler(tauri::generate_handler![quit_app])
        .setup(|app| {
            let main_window = app.get_webview_window("main").unwrap();
            // 设置平台特定配置
            if os::macos::is_macos() {
                os::macos::setup_app();
                os::macos::setup_window(&main_window).expect("设置macOS窗口配置时出错");
            }

            if os::windows::is_windows() {
                os::windows::setup_app();
                os::windows::setup_window(&main_window).expect("设置Windows窗口配置时出错");
            }

            // 显式隐藏 settings 窗口（保险做法）
            // if let Some(settings_window) = app.get_webview_window("settings") {
            //     settings_window.hide().ok();
            // }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
