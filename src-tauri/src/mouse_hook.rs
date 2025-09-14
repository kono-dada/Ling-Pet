/*!
 * @fileoverview Windows全局鼠标hook管理器
 * @description 实现Windows平台的全局鼠标事件监听，用于桌宠固定功能
 * @features
 *   - 全局左键和右键事件监听
 *   - 鼠标位置获取
 *   - Hook状态管理
 *   - 调试信息输出
 *   - 线程安全的状态管理
 * @platform Windows only
 * @author AI Assistant
 * @version 1.0.0
 */

#[cfg(target_os = "windows")]
use winapi::{
    shared::{
        minwindef::{LPARAM, LRESULT, WPARAM},
        windef::{HHOOK, POINT},
    },
    um::{
        winuser::{
            CallNextHookEx, GetCursorPos, SetWindowsHookExW, UnhookWindowsHookEx,
            HC_ACTION, WH_MOUSE_LL, WM_LBUTTONDOWN, WM_RBUTTONDOWN, MSLLHOOKSTRUCT,
        },
        libloaderapi::GetModuleHandleW,
    },
};

use std::sync::{Arc, Mutex, mpsc::{self, Receiver, Sender}};
use once_cell::sync::Lazy;
use log::{debug, info, warn, error};

#[derive(Debug, Clone)]
pub struct MouseEvent {
    pub x: i32,
    pub y: i32,
    pub button: MouseButton,
    pub window_handle: Option<u64>, // HWND as u64 for cross-platform compatibility
}

#[derive(Debug, Clone)]
pub enum MouseButton {
    Left,
    Right,
}

pub struct MouseHookManager {
    #[cfg(target_os = "windows")]
    hook_handle: Option<usize>, // Use usize instead of HHOOK for Send/Sync
    is_active: bool,
    event_sender: Option<Sender<MouseEvent>>,
    target_window: Option<u64>, // Target window handle to monitor
}

// Windows-specific hook data structure for thread-safe communication
#[cfg(target_os = "windows")]
struct HookData {
    sender: Sender<MouseEvent>,
    target_window: Option<u64>,
}

// Global static storage for hook callback communication
#[cfg(target_os = "windows")]
static HOOK_DATA: Lazy<Arc<Mutex<Option<HookData>>>> = Lazy::new(|| Arc::new(Mutex::new(None)));

impl MouseHookManager {
    pub fn new() -> Self {
        debug!("创建新的鼠标Hook管理器");
        Self {
            #[cfg(target_os = "windows")]
            hook_handle: None,
            is_active: false,
            event_sender: None,
            target_window: None,
        }
    }

    /// 启动鼠标hook监听
    pub fn start_hook(&mut self, target_window: Option<u64>) -> Result<Receiver<MouseEvent>, String> {
        if self.is_active {
            warn!("鼠标Hook已经在运行中");
            return Err("Hook already running".to_string());
        }

        info!("启动鼠标Hook, 目标窗口: {:?}", target_window);
        self.target_window = target_window;

        #[cfg(target_os = "windows")]
        {
            self.start_windows_hook()
        }

        #[cfg(not(target_os = "windows"))]
        {
            error!("鼠标Hook仅支持Windows平台");
            Err("Mouse hook only supported on Windows".to_string())
        }
    }

    #[cfg(target_os = "windows")]
    fn start_windows_hook(&mut self) -> Result<Receiver<MouseEvent>, String> {
        let (sender, receiver) = mpsc::channel();
        self.event_sender = Some(sender.clone());

        // Set up hook data for the callback
        {
            let mut hook_data = HOOK_DATA.lock().map_err(|_| "Failed to lock hook data")?;
            *hook_data = Some(HookData {
                sender,
                target_window: self.target_window,
            });
        }

        let hook_handle = unsafe {
            SetWindowsHookExW(
                WH_MOUSE_LL,
                Some(low_level_mouse_proc),
                GetModuleHandleW(std::ptr::null()),
                0,
            )
        };

        if hook_handle.is_null() {
            error!("创建鼠标Hook失败");
            return Err("Failed to create mouse hook".to_string());
        }

        self.hook_handle = Some(hook_handle as usize);
        self.is_active = true;

        info!("鼠标Hook启动成功, Handle: {:?}", hook_handle);
        debug!("Hook回调函数已注册，开始监听鼠标事件");

        Ok(receiver)
    }

    /// 停止鼠标hook监听
    pub fn stop_hook(&mut self) -> Result<(), String> {
        if !self.is_active {
            debug!("鼠标Hook未运行，无需停止");
            return Ok(());
        }

        info!("停止鼠标Hook");

        #[cfg(target_os = "windows")]
        {
            self.stop_windows_hook()
        }

        #[cfg(not(target_os = "windows"))]
        {
            Ok(())
        }
    }

    #[cfg(target_os = "windows")]
    fn stop_windows_hook(&mut self) -> Result<(), String> {
        if let Some(hook_handle) = self.hook_handle.take() {
            let result = unsafe { UnhookWindowsHookEx(hook_handle as HHOOK) };
            if result == 0 {
                error!("卸载鼠标Hook失败");
                return Err("Failed to unhook mouse hook".to_string());
            }
            info!("鼠标Hook卸载成功");
        }

        // Clear hook data
        {
            let mut hook_data = HOOK_DATA.lock().map_err(|_| "Failed to lock hook data")?;
            *hook_data = None;
        }

        self.is_active = false;
        self.event_sender = None;
        self.target_window = None;

        debug!("鼠标Hook管理器状态已重置");
        Ok(())
    }

    /// 检查hook是否激活
    pub fn is_active(&self) -> bool {
        self.is_active
    }

    /// 获取当前鼠标位置
    pub fn get_cursor_position() -> Result<(i32, i32), String> {
        #[cfg(target_os = "windows")]
        {
            let mut point = POINT { x: 0, y: 0 };
            let result = unsafe { GetCursorPos(&mut point) };
            if result == 0 {
                error!("获取鼠标位置失败");
                return Err("Failed to get cursor position".to_string());
            }
            debug!("当前鼠标位置: ({}, {})", point.x, point.y);
            Ok((point.x, point.y))
        }

        #[cfg(not(target_os = "windows"))]
        {
            error!("获取鼠标位置仅支持Windows平台");
            Err("Get cursor position only supported on Windows".to_string())
        }
    }

    /// 设置目标窗口
    pub fn set_target_window(&mut self, window_handle: Option<u64>) {
        debug!("设置目标窗口: {:?}", window_handle);
        self.target_window = window_handle;
        
        // Update hook data if hook is active
        #[cfg(target_os = "windows")]
        if self.is_active {
            if let Ok(mut hook_data) = HOOK_DATA.lock() {
                if let Some(ref mut data) = *hook_data {
                    data.target_window = window_handle;
                    debug!("已更新Hook回调中的目标窗口");
                }
            }
        }
    }
}

impl Drop for MouseHookManager {
    fn drop(&mut self) {
        debug!("销毁鼠标Hook管理器");
        let _ = self.stop_hook();
    }
}

// Windows低级鼠标回调函数
#[cfg(target_os = "windows")]
unsafe extern "system" fn low_level_mouse_proc(
    n_code: i32,
    w_param: WPARAM,
    l_param: LPARAM,
) -> LRESULT {
    if n_code == HC_ACTION {
        let hook_struct = &*(l_param as *const MSLLHOOKSTRUCT);
        
        let button = match w_param as u32 {
            WM_LBUTTONDOWN => Some(MouseButton::Left),
            WM_RBUTTONDOWN => Some(MouseButton::Right),
            _ => None,
        };

        if let Some(button) = button {
            let mouse_event = MouseEvent {
                x: hook_struct.pt.x,
                y: hook_struct.pt.y,
                button: button.clone(),
                window_handle: None, // Will be filled by handler if needed
            };

            debug!("检测到鼠标事件: {:?} at ({}, {})", 
                   match mouse_event.button {
                       MouseButton::Left => "左键",
                       MouseButton::Right => "右键",
                   },
                   mouse_event.x, mouse_event.y);

            // 显示全局鼠标事件监听信息
            info!("🌍 全局Hook捕获: {} 在屏幕位置 ({}, {})",
                  match mouse_event.button {
                      MouseButton::Left => "左键点击",
                      MouseButton::Right => "右键点击", 
                  },
                  mouse_event.x, mouse_event.y);

            // Send event through channel if hook data is available
            if let Ok(hook_data) = HOOK_DATA.lock() {
                if let Some(ref data) = *hook_data {
                    if let Err(e) = data.sender.send(mouse_event) {
                        error!("发送鼠标事件失败: {}", e);
                    } else {
                        debug!("鼠标事件已发送到处理通道");
                        
                        // 对于右键事件，特别记录日志
                        if matches!(button, MouseButton::Right) {
                            info!("右键事件已捕获并发送给应用程序处理");
                        }
                        
                        // 对于左键事件，我们让它继续传递，不阻止
                        if matches!(button, MouseButton::Left) {
                            debug!("左键事件将继续传递给系统处理");
                        }
                    }
                }
            }
        }
    }

    CallNextHookEx(std::ptr::null_mut(), n_code, w_param, l_param)
}