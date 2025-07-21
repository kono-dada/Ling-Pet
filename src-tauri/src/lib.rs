// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Manager;

mod commands;
mod os;
use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // 设置平台特定配置
            if os::macos::is_macos() {
                os::macos::setup_app();
            }

            if os::windows::is_windows() {
                os::windows::setup_app();
            }

            let main_window = app.get_webview_window("main").unwrap();

            // 设置窗口特定配置
            os::macos::setup_window(&main_window).expect("设置macOS窗口配置时出错");

            os::windows::setup_window(&main_window).expect("设置Windows窗口配置时出错");

            Ok(())
        })
        .plugin(
            tauri_plugin_log::Builder::new()
            .level(log::LevelFilter::Debug).build(),
        )
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_pinia::init())
        .invoke_handler(tauri::generate_handler![quit_app])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
