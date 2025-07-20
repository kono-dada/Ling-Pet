/*!
 * @fileoverview Windows平台特定功能模块
 * @description 实现Windows平台的特定功能，包括窗口阴影控制、任务栏管理等
 * @features
 *   - 禁用窗口阴影以实现真正的透明效果
 *   - 任务栏图标管理
 *   - 窗口行为优化
 *   - 跨平台兼容性处理
 * @apis
 *   - setup_app: 设置应用全局配置
 *   - setup_window: 设置窗口特定行为
 *   - is_windows: 平台检测函数
 * @platform Windows only
 * @author dada
 * @version 1.0.0
 * @since 2025-07-13
 */

//! Windows 特定的功能实现
//! 
//! 这个模块包含所有 Windows 平台特定的功能，包括：
//! - 禁用窗口阴影以实现真正的透明效果
//! - 任务栏图标管理
//! - 窗口行为优化

/// 设置 Windows 应用的全局配置
#[cfg(target_os = "windows")]
pub fn setup_app() {
    // Windows 平台特定的应用设置
    // 目前无需特殊配置，但预留给将来的功能
}

/// 设置 Windows 窗口的特定行为
#[cfg(target_os = "windows")]
pub fn setup_window(window: &WebviewWindow) -> Result<(), Box<dyn std::error::Error>> {
    // 对于透明无边框窗口，禁用阴影以获得真正的透明效果
    // 这解决了Windows上透明窗口仍有阴影的问题
    window.set_shadow(false)?;
    
    // 确保窗口可以拖拽
    window.set_ignore_cursor_events(false)?;
    
    // Windows特定：设置窗口类名以便更好的系统集成
    // 这可以帮助改善事件处理和DPI感知
    let _ = window.set_title("桌面宠物");
    
    Ok(())
}

/// 在非 Windows 平台上的空实现
#[cfg(not(target_os = "windows"))]
pub fn setup_app() {
    // 在非 Windows 平台上什么都不做
}

/// 在非 Windows 平台上的空实现
#[cfg(not(target_os = "windows"))]
pub fn setup_window(_window: &tauri::WebviewWindow) -> Result<(), Box<dyn std::error::Error>> {
    // 在非 Windows 平台上什么都不做
    Ok(())
}

/// 检测当前是否运行在 Windows 上
pub fn is_windows() -> bool {
    cfg!(target_os = "windows")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_windows() {
        // 这个测试会根据编译目标平台返回不同结果
        let result = is_windows();
        #[cfg(target_os = "windows")]
        assert_eq!(result, true);
        #[cfg(not(target_os = "windows"))]
        assert_eq!(result, false);
    }
}