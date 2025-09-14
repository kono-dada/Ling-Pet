/*!
 * @fileoverview 基于uiohook-rs的全局鼠标事件监听管理器
 * @description 使用uiohook-rs实现跨平台的全局鼠标事件监听，支持鼠标左右键和位置获取
 * @features
 *   - 全局鼠标左右键事件监听
 *   - 实时鼠标位置获取
 *   - 线程安全的事件处理
 *   - 详细的调试信息输出
 *   - 桌宠窗口位置检测
 * @platform Cross-platform (Windows, macOS, Linux)
 * @author AI Assistant
 * @version 1.0.0
 */

use std::sync::{Arc, Mutex, mpsc::{self, Receiver, Sender}};
use std::thread;
use log::{debug, info, warn, error};
use uiohook_rs::hook::mouse::{MouseEvent, MouseEventType};
use uiohook_rs::{EventHandler, Uiohook, UiohookEvent};
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlobalMouseEvent {
    pub x: i32,
    pub y: i32,
    pub button: String, // "left" 或 "right"
    pub timestamp: u64,
    pub is_over_pet: bool,
}

struct MouseEventHandler {
    sender: Sender<GlobalMouseEvent>,
    pet_window_bounds: Arc<Mutex<Option<WindowBounds>>>,
}

impl EventHandler for MouseEventHandler {
    fn handle_event(&self, event: &UiohookEvent) {
        info!("🎯 [EventHandler] 收到UIohook事件: {:?}", event);
        
        match event {
            UiohookEvent::Mouse(mouse_event) => {
                info!("🖱️ [EventHandler] 鼠标事件匹配成功，调用handle_mouse_event");
                self.handle_mouse_event(mouse_event);
                info!("✅ [EventHandler] handle_mouse_event调用完成");
            }
            UiohookEvent::HookEnabled => {
                info!("🔗 UIohook 监听已启用");
            }
            UiohookEvent::HookDisabled => {
                info!("🚫 UIohook 监听已禁用");
            }
            _ => {
                info!("📋 [EventHandler] 其他类型的UIohook事件: {:?}", event);
            }
        }
    }
}

impl MouseEventHandler {
    fn handle_mouse_event(&self, mouse_event: &MouseEvent) {
        // 添加更详细的调试信息
        info!("🔍 [handle_mouse_event] 进入方法: 类型={:?}, 按钮={:?}, 位置=({}, {})", 
               mouse_event.event_type, mouse_event.button, mouse_event.x, mouse_event.y);
        
        // 处理鼠标移动事件用于预透过
        if let MouseEventType::Moved = mouse_event.event_type {
            let x = mouse_event.x as i32;
            let y = mouse_event.y as i32;
            
            // 检查是否在桌宠窗口上方
            let is_over_pet = {
                if let Ok(bounds_guard) = self.pet_window_bounds.lock() {
                    if let Some(bounds) = bounds_guard.as_ref() {
                        let over = x >= bounds.x && x <= bounds.x + bounds.width &&
                                  y >= bounds.y && y <= bounds.y + bounds.height;
                        over
                    } else {
                        false
                    }
                } else {
                    false
                }
            };
            
            // 预透过机制：鼠标在桌宠上时设置透过，不在时取消透过
            let move_event = GlobalMouseEvent {
                x,
                y,
                button: "move".to_string(),
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64,
                is_over_pet,
            };
            
            // 发送移动事件用于预透过处理
            if let Err(_) = self.sender.send(move_event) {
                // 静默失败，避免日志过多
            }
            
            return; // 移动事件不需要后续处理
        }
        
        // 只处理鼠标按下事件
        info!("⚡ [handle_mouse_event] 检查事件类型: {:?}", mouse_event.event_type);
        if let MouseEventType::Pressed = mouse_event.event_type {
            info!("✅ [handle_mouse_event] 事件类型匹配: 鼠标按下事件");
            let button = match format!("{:?}", mouse_event.button).as_str() {
                "Button1" => "left",   // 左键
                "Left" => "left",     // 兼容旧格式
                "Button2" => "right",  // 右键  
                "Right" => "right",   // 兼容旧格式
                _ => {
                    info!("⏭️ [handle_mouse_event] 忽略非左右键: {:?}", mouse_event.button);
                    return; // 只处理左右键
                }
            };

            let x = mouse_event.x as i32;
            let y = mouse_event.y as i32;
            
            info!("处理{}键按下事件，位置: ({}, {})", button, x, y);
            
            // 检查是否在桌宠窗口上方
            let is_over_pet = {
                if let Ok(bounds_guard) = self.pet_window_bounds.lock() {
                    if let Some(bounds) = bounds_guard.as_ref() {
                        let over = x >= bounds.x && x <= bounds.x + bounds.width &&
                                  y >= bounds.y && y <= bounds.y + bounds.height;
                        debug!("📐 桌宠边界检查: 鼠标({},{}) vs 边界({},{},{}x{}), 结果={}", 
                               x, y, bounds.x, bounds.y, bounds.width, bounds.height, over);
                        over
                    } else {
                        debug!("桌宠窗口边界未设置");
                        false
                    }
                } else {
                    error!("无法锁定桌宠窗口边界");
                    false
                }
            };

            let mouse_event = GlobalMouseEvent {
                x,
                y,
                button: button.to_string(),
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64,
                is_over_pet,
            };

            // 输出详细的调试信息
            info!("🌍 全局鼠标事件捕获: {} 在位置 ({}, {}) {}",
                  if button == "left" { "左键点击" } else { "右键点击" },
                  x, y,
                  if is_over_pet { "【在桌宠上】" } else { "【不在桌宠上】" });

            if is_over_pet {
                info!("🐱 桌宠区域内的{}被检测到！", 
                      if button == "left" { "左键点击" } else { "右键点击" });
            } else {
                debug!("🔍 桌宠区域外的{}，位置: ({}, {})", 
                       if button == "left" { "左键点击" } else { "右键点击" }, x, y);
            }

            // 发送事件到主线程
            if let Err(e) = self.sender.send(mouse_event) {
                error!("发送全局鼠标事件失败: {}", e);
            } else {
                debug!("全局鼠标事件已发送到处理队列");
            }
        } else {
            info!("⏭️ [handle_mouse_event] 忽略非按下事件: {:?}", mouse_event.event_type);
        }
    }
}

pub struct UiohookManager {
    event_sender: Option<Sender<GlobalMouseEvent>>,
    is_running: Arc<Mutex<bool>>,
    pet_window_bounds: Arc<Mutex<Option<WindowBounds>>>,
}

#[derive(Debug, Clone)]
pub struct WindowBounds {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

impl UiohookManager {
    pub fn new() -> Self {
        info!("创建UIohook全局鼠标监听管理器");
        Self {
            event_sender: None,
            is_running: Arc::new(Mutex::new(false)),
            pet_window_bounds: Arc::new(Mutex::new(None)),
        }
    }

    /// 启动全局鼠标监听
    pub fn start_global_mouse_monitoring(&mut self) -> Result<Receiver<GlobalMouseEvent>, String> {
        if *self.is_running.lock().unwrap() {
            warn!("UIohook监听已经在运行中");
            return Err("UIohook monitoring already running".to_string());
        }

        info!("🚀 启动UIohook全局鼠标监听");

        let (sender, receiver) = mpsc::channel();
        self.event_sender = Some(sender.clone());
        
        let pet_bounds = Arc::clone(&self.pet_window_bounds);
        let is_running = Arc::clone(&self.is_running);

        // 在新线程中启动UIohook监听
        thread::spawn(move || {
            info!("UIohook监听线程已启动");
            
            let event_handler = MouseEventHandler {
                sender,
                pet_window_bounds: pet_bounds,
            };
            
            let uiohook = Uiohook::new(event_handler);
            
            {
                let mut running = is_running.lock().unwrap();
                *running = true;
            }

            // 开始监听
            info!("开始UIohook事件循环");
            if let Err(e) = uiohook.run() {
                error!("UIohook运行失败: {:?}", e);
                let mut running = is_running.lock().unwrap();
                *running = false;
                return;
            }
            
            info!("UIohook监听循环启动成功");
            
            // 保持运行直到停止
            #[cfg(target_os = "macos")]
            {
                unsafe {
                    core_foundation::runloop::CFRunLoopRun();
                }
            }
            #[cfg(not(target_os = "macos"))]
            {
                loop {
                    if !*is_running.lock().unwrap() {
                        break;
                    }
                    std::thread::sleep(std::time::Duration::from_millis(100));
                }
            }
            
            if let Err(e) = uiohook.stop() {
                error!("停止UIohook失败: {:?}", e);
            }
            
            info!("UIohook监听线程结束");
        });

        info!("✅ UIohook全局鼠标监听启动成功");
        Ok(receiver)
    }

    /// 停止全局鼠标监听
    pub fn stop_global_mouse_monitoring(&mut self) -> Result<(), String> {
        if !*self.is_running.lock().unwrap() {
            debug!("UIohook监听未运行，无需停止");
            return Ok(());
        }

        info!("🛑 停止UIohook全局鼠标监听");
        
        {
            let mut running = self.is_running.lock().unwrap();
            *running = false;
        }
        
        self.event_sender = None;

        info!("✅ UIohook全局鼠标监听已停止");
        Ok(())
    }

    /// 更新桌宠窗口边界信息
    pub fn update_pet_window_bounds(&self, x: i32, y: i32, width: i32, height: i32) -> Result<(), String> {
        debug!("更新桌宠窗口边界: ({}, {}) {}x{}", x, y, width, height);
        
        if let Ok(mut bounds) = self.pet_window_bounds.lock() {
            *bounds = Some(WindowBounds { x, y, width, height });
            info!("📐 桌宠窗口边界已更新: 位置({}, {}) 大小{}x{}", x, y, width, height);
            Ok(())
        } else {
            error!("无法锁定桌宠窗口边界进行更新");
            Err("Failed to lock pet window bounds".to_string())
        }
    }

    /// 获取当前鼠标位置
    pub fn get_current_mouse_position(&self) -> Result<(i32, i32), String> {
        // UIohook-rs可能提供获取当前鼠标位置的方法
        // 这里我们使用系统调用作为fallback
        #[cfg(target_os = "windows")]
        {
            use winapi::um::winuser::GetCursorPos;
            use winapi::shared::windef::POINT;
            
            unsafe {
                let mut point = POINT { x: 0, y: 0 };
                if GetCursorPos(&mut point) != 0 {
                    debug!("当前鼠标位置: ({}, {})", point.x, point.y);
                    Ok((point.x, point.y))
                } else {
                    error!("获取鼠标位置失败");
                    Err("Failed to get cursor position".to_string())
                }
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            warn!("非Windows平台暂不支持获取鼠标位置");
            Err("Mouse position not supported on this platform".to_string())
        }
    }

    /// 检查是否正在运行
    pub fn is_running(&self) -> bool {
        *self.is_running.lock().unwrap()
    }
}

impl Drop for UiohookManager {
    fn drop(&mut self) {
        debug!("销毁UIohook管理器");
        let _ = self.stop_global_mouse_monitoring();
    }
}