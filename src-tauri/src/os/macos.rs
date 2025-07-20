/*!
 * @fileoverview macOS平台特定功能模块
 * @description 实现macOS平台的特定功能，包括Dock图标隐藏、窗口行为设置等
 * @features
 *   - 隐藏Dock图标 (NSApplicationActivationPolicyAccessory)
 *   - 设置窗口不参与四指轻扫等窗口活动
 *   - 窗口置顶和透明背景支持
 *   - 跨平台兼容性处理
 * @apis
 *   - setup_app: 设置应用全局配置
 *   - setup_window: 设置窗口特定行为
 *   - is_macos: 平台检测函数
 * @dependencies
 *   - cocoa: macOS Cocoa框架绑定
 *   - objc: Objective-C运行时绑定
 * @platform macOS only
 * @author dada
 * @version 1.0.0
 * @since 2025-07-13
 */

//! macOS 特定的功能实现
//! 
//! 这个模块包含所有 macOS 平台特定的功能，包括：
//! - 隐藏 Dock 图标
//! - 设置窗口行为以避免参与四指轻扫等窗口活动

// 抑制 objc 包的已知警告
#![allow(unexpected_cfgs)]

#[cfg(target_os = "macos")]
use cocoa::appkit::{NSApp, NSApplication, NSApplicationActivationPolicy, NSWindowCollectionBehavior};
#[cfg(target_os = "macos")]
use objc::{runtime::Object, msg_send, sel, sel_impl};
#[cfg(target_os = "macos")]
use tauri::WebviewWindow;

/// 设置 macOS 应用的全局配置
#[cfg(target_os = "macos")]
pub fn setup_app() {
    unsafe {
        let app = NSApp();
        // 设置为 accessory 模式，这样不会在 Dock 中显示图标
        // NSApplicationActivationPolicyAccessory 让应用成为后台应用，不显示在 Dock 中
        app.setActivationPolicy_(NSApplicationActivationPolicy::NSApplicationActivationPolicyAccessory);
    }
}

/// 设置 macOS 窗口的特定行为
#[cfg(target_os = "macos")]
pub fn setup_window(window: &WebviewWindow) -> Result<(), Box<dyn std::error::Error>> {
    // 确保窗口可以拖拽
    window.set_ignore_cursor_events(false)?;
    
    // 获取 NSWindow 对象并设置窗口行为
    let nswindow = window.ns_window()? as *mut Object;
    
    unsafe {
        // 设置窗口集合行为，使其：
        // - CanJoinAllSpaces: 可以出现在所有桌面空间中
        // - IgnoresCycle: 不参与窗口循环（Cmd+Tab 等）
        // - Stationary: 在空间切换时保持位置
        let behavior = NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces |
                      NSWindowCollectionBehavior::NSWindowCollectionBehaviorIgnoresCycle |
                      NSWindowCollectionBehavior::NSWindowCollectionBehaviorStationary;
        
        #[allow(unused_variables)]
        let _: () = msg_send![nswindow, setCollectionBehavior: behavior];
    }
    
    Ok(())
}

/// 在非 macOS 平台上的空实现
#[cfg(not(target_os = "macos"))]
pub fn setup_app() {
    // 在非 macOS 平台上什么都不做
}

/// 在非 macOS 平台上的空实现
#[cfg(not(target_os = "macos"))]
pub fn setup_window(_window: &tauri::WebviewWindow) -> Result<(), Box<dyn std::error::Error>> {
    // 在非 macOS 平台上什么都不做
    Ok(())
}

/// 检测当前是否运行在 macOS 上
pub fn is_macos() -> bool {
    cfg!(target_os = "macos")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_macos() {
        // 这个测试会根据编译目标平台返回不同结果
        let result = is_macos();
        #[cfg(target_os = "macos")]
        assert_eq!(result, true);
        #[cfg(not(target_os = "macos"))]
        assert_eq!(result, false);
    }
}
