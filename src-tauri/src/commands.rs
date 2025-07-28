use tauri::Manager;
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
pub async fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
pub async fn open_data_folder(app: tauri::AppHandle) -> Result<(), String> {
    
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| {
            let error_msg = format!("Failed to get app data directory: {}", e);
            error_msg
        })?;
    
    // Create the directory if it doesn't exist
    if !app_data_dir.exists() {
        std::fs::create_dir_all(&app_data_dir)
            .map_err(|e| {
                let error_msg = format!("Failed to create app data directory: {}", e);
                error_msg
            })?;
    } 

    // Try different approaches to open the folder
    let opener = app.opener();
    
    // Try method 1: reveal_item_in_dir (shows the folder in file explorer)
    opener.reveal_item_in_dir(&app_data_dir).expect("Failed to reveal item in directory");

    Ok(())
}