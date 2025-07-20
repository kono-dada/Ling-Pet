#[tauri::command]
pub async fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}
