/**
 * @fileoverview UIohook全局鼠标监听管理器
 * @description 基于uiohook-rs的全局鼠标事件监听，实现桌宠透过功能
 * @author AI Assistant
 * @version 1.0.0
 */

import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { debug, info, warn, error } from '@tauri-apps/plugin-log';

export interface GlobalMouseEvent {
  x: number;
  y: number;
  button: 'left' | 'right' | 'move';
  timestamp: number;
  is_over_pet: boolean;
}

export class UiohookPetManager {
  private isMonitoring = false;
  private pollInterval?: number;
  private isWindowClickThrough = false;
  private lastMouseMoveLog = 0;

  constructor() {
    info('🚀 初始化UIohook桌宠管理器');
    
    // 监听右键菜单关闭事件，恢复透过状态
    this.setupContextMenuListener();
  }
  
  /**
   * 设置右键菜单监听器
   */
  private setupContextMenuListener(): void {
    // 监听右键菜单关闭事件
    document.addEventListener('click', async (event) => {
      // 如果点击在菜单外部，表示菜单关闭
      const contextMenu = document.querySelector('.context-menu');
      const isClickOutsideMenu = contextMenu && !contextMenu.contains(event.target as Node);
      
      if (isClickOutsideMenu || !contextMenu) {
        // 菜单关闭，恢复透过状态
        await this.restoreClickThroughAfterMenuClose();
      }
    });
    
    // 监听键盘事件，Esc键关闭菜单
    document.addEventListener('keydown', async (event) => {
      if (event.key === 'Escape') {
        const contextMenu = document.querySelector('.context-menu');
        if (contextMenu) {
          await this.restoreClickThroughAfterMenuClose();
        }
      }
    });
    
    debug('🗑️ 右键菜单监听器已设置');
  }
  
  /**
   * 菜单关闭后恢复透过状态
   */
  private async restoreClickThroughAfterMenuClose(): Promise<void> {
    try {
      // 检查是否为固定模式，只有在固定模式下才恢复透过
      const isPetFixedMode = await this.checkIfPetFixedMode();
      
      if (isPetFixedMode) {
        // 等待一小段时间确保菜单完全关闭
        setTimeout(async () => {
          await this.setWindowClickThrough(true);
          info('🔄 右键菜单关闭后，窗口恢复为透过状态');
        }, 100);
      } else {
        // 非固定模式，保持不透过状态
        await this.setWindowClickThrough(false);
        info('🔒 非固定模式：右键菜单关闭后，保持窗口不透过状态');
      }
    } catch (err) {
      error(`恢复透过状态失败: ${String(err)}`);
    }
  }
  
  /**
   * 检查是否为固定桌宠模式
   */
  private async checkIfPetFixedMode(): Promise<boolean> {
    try {
      // 检查全局状态或配置来判断是否处于固定模式
      // 这里可以通过检查全局状态或调用相关API
      const { useAppearanceConfigStore } = await import('../stores/configs/appearanceConfig');
      const ac = useAppearanceConfigStore();
      return ac.isPetFixed;
    } catch (err) {
      debug(`检查固定桌宠模式失败: ${String(err)}`);
      return false; // 默认为非固定模式
    }
  }

  /**
   * 启动UIohook全局鼠标监听
   */
  async startGlobalMonitoring(): Promise<void> {
    try {
      info('🎯 启动UIohook全局鼠标监听');
      
      if (this.isMonitoring) {
        warn('UIohook监听已经在运行中');
        return;
      }

      // 更新桌宠窗口边界信息
      await this.updatePetWindowBounds();
      
      // 检查是否是在固定桌宠模式下启动，只有在固定模式下才设置透过
      const isPetFixedMode = await this.checkIfPetFixedMode();
      
      if (isPetFixedMode) {
        // 设置桌宠窗口为默认透过状态（仅在固定模式下）
        await this.setWindowClickThrough(true);
        info('🔄 桌宠固定模式：窗口设置为默认透过状态');
      } else {
        // 非固定模式，确保窗口不透过
        await this.setWindowClickThrough(false);
        info('🔒 非固定模式：窗口设置为不透过状态');
      }

      // 尝试启动UIohook监听
      try {
        await invoke('start_uiohook_monitoring');
        this.isMonitoring = true;
        
        // 开始轮询事件
        this.startEventPolling();
        
        info('✅ UIohook全局鼠标监听启动成功');
      } catch (uiohookError) {
        warn(`UIohook启动失败: ${String(uiohookError)}, 使用备用方案`);
        
        // 如果UIohook失败，使用备用方案：直接监听窗口事件
        this.startFallbackMouseMonitoring();
        this.isMonitoring = true;
        
        info('✅ 备用鼠标监听启动成功');
      }
      
    } catch (err) {
      error(`启动鼠标监听失败: ${String(err)}`);
      throw err;
    }
  }

  /**
   * 停止UIohook全局鼠标监听
   */
  async stopGlobalMonitoring(): Promise<void> {
    try {
      info('🛑 停止UIohook全局鼠标监听');
      
      if (!this.isMonitoring) {
        debug('UIohook监听未运行，无需停止');
        return;
      }

      // 停止事件轮询
      this.stopEventPolling();
      
      // 停止UIohook监听
      await invoke('stop_uiohook_monitoring');
      
      // 确保窗口不透过
      await this.setWindowClickThrough(false);
      
      this.isMonitoring = false;
      
      info('✅ UIohook全局鼠标监听停止成功');
    } catch (err) {
      error(`停止UIohook监听失败: ${String(err)}`);
      throw err;
    }
  }

  /**
   * 更新桌宠窗口边界信息
   */
  private async updatePetWindowBounds(): Promise<void> {
    try {
      const currentWindow = getCurrentWebviewWindow();
      const position = await currentWindow.outerPosition();
      const size = await currentWindow.outerSize();
      
      await invoke('update_pet_window_bounds', {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height
      });
      
      info(`📐 桌宠窗口边界已更新: (${position.x}, ${position.y}) ${size.width}x${size.height}`);
    } catch (err) {
      error(`更新桌宠窗口边界失败: ${String(err)}`);
    }
  }

  /**
   * 开始事件轮询
   */
  private startEventPolling(): void {
    debug('🔄 开始UIohook事件轮询');
    
    this.pollInterval = window.setInterval(async () => {
      try {
        const events = await invoke<GlobalMouseEvent[]>('poll_uiohook_events');
        
        for (const event of events) {
          await this.handleGlobalMouseEvent(event);
        }
      } catch (err) {
        error(`轮询UIohook事件失败: ${String(err)}`);
      }
    }, 16); // 约60FPS的轮询频率
  }

  /**
   * 停止事件轮询
   */
  private stopEventPolling(): void {
    debug('🔄 停止UIohook事件轮询');
    
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
  }

  /**
   * 处理全局鼠标事件
   */
  private async handleGlobalMouseEvent(event: GlobalMouseEvent): Promise<void> {
    // 处理鼠标移动事件 - 仅记录状态，不改变透过设置
    if (event.button === 'move') {
      // 限制日志频率，避免过多输出
      if (!this.lastMouseMoveLog || Date.now() - this.lastMouseMoveLog > 2000) {
        debug(`📍 鼠标移动: (${event.x}, ${event.y}) ${event.is_over_pet ? '【在桌宠上】' : '【不在桌宠上】'}`);
        this.lastMouseMoveLog = Date.now();
      }
      
      // 重要：鼠标移动时不改变透过状态，保持桌宠默认透过
      // 这样可以避免覆盖右键时设置的不透过状态
      return; // 移动事件处理完成
    }
    
    info(`🌍 处理全局鼠标事件: ${event.button} 在 (${event.x}, ${event.y}) ${event.is_over_pet ? '【在桌宠上】' : '【不在桌宠上】'}`);
    
    // 更详细的位置信息
    debug(`📐 UIohook事件详情: 鼠标(${event.x}, ${event.y}), 按键=${event.button}, 时间=${event.timestamp}, 在桌宠上=${event.is_over_pet}`);
    
    if (event.is_over_pet) {
      if (event.button === 'left') {
        info('🐱 检测到左键点击桌宠 - 保持透过状态，点击将直接透过');
        // 左键点击时不需要处理，保持默认透过状态即可
      } else if (event.button === 'right') {
        info('🐱 检测到右键点击桌宠 - 设置为不透过以显示菜单');
        await this.handleRightClickOnPet(event.x, event.y);
      }
    } else {
      debug(`🔍 鼠标不在桌宠上的${event.button}键点击，位置: (${event.x}, ${event.y})`);
      // 鼠标不在桌宠上时，恢复默认透过状态
      await this.setWindowClickThrough(true);
    }
  }

  /**
   * 处理左键点击桌宠 - 版本2 (预透过机制)
   */
  private async handleLeftClickOnPetV2(): Promise<void> {
    try {
      info('⚡ 使用预透过机制处理左键点击...');
      
      // 新策略: 在平时就设置透过，点击时不变
      // 这样就能确保左键点击直接透过到底层
      await this.setWindowClickThrough(true);
      info('🔄 窗口设为透过状态，左键点击将直接透过');
      
      // 等待一小段时间再恢复交互，让点击事件充分传播
      setTimeout(async () => {
        await this.setWindowClickThrough(false);
        info('🔙 窗口恢复为交互状态');
      }, 300); // 300ms后恢复
      
      debug('✅ 预透过机制处理完成');
    } catch (err) {
      error(`预透过机制处理失败: ${String(err)}`);
      // 确保在出错时也恢复窗口状态
      await this.setWindowClickThrough(false);
    }
  }

  /**
   * 处理左键点击桌宠
   */
  private async handleLeftClickOnPet(): Promise<void> {
    try {
      info('⚡ 开始左键透过处理...');
      
      // 步骤1: 立即设置窗口透过
      await this.setWindowClickThrough(true);
      info('📋 窗口已设置为透过状态');
      
      // 步骤2: 增加延迟时间让点击事件充分通过
      await new Promise(resolve => setTimeout(resolve, 200)); // 增加到200ms
      
      // 步骤3: 恢复窗口为不透过
      await this.setWindowClickThrough(false);
      info('📋 窗口已恢复为交互状态');
      
      debug('✅ 左键透过处理完成');
    } catch (err) {
      error(`左键透过处理失败: ${String(err)}`);
      // 确保在出错时也恢复窗口状态
      await this.setWindowClickThrough(false);
    }
  }

  /**
   * 处理右键点击桌宠
   */
  private async handleRightClickOnPet(mouseX?: number, mouseY?: number): Promise<void> {
    try {
      info('🖱️ 处理右键点击桌宠');
      
      // 设置窗口为不透过，以便右键菜单能正常工作
      await this.setWindowClickThrough(false);
      info('🔒 右键点击时，窗口设置为不透过状态以显示菜单');
      
      // 触发右键菜单显示
      await this.showContextMenu(mouseX, mouseY);
      
    } catch (err) {
      error(`右键点击处理失败: ${String(err)}`);
    }
  }
  
  /**
   * 显示右键菜单
   */
  private async showContextMenu(mouseX?: number, mouseY?: number): Promise<void> {
    try {
      // 创建模拟的鼠标事件来触发右键菜单
      const currentWindow = getCurrentWebviewWindow();
      const windowPosition = await currentWindow.outerPosition();
      
      // 如果没有提供鼠标位置，使用窗口中心
      const clientX = mouseX ? mouseX - windowPosition.x : 100;
      const clientY = mouseY ? mouseY - windowPosition.y : 100;
      
      info(`🎯 触发右键菜单显示，位置: 屏幕(${mouseX || 'N/A'}, ${mouseY || 'N/A'}) -> 窗口内(${clientX}, ${clientY})`);
      
      // 尝试直接触发contextmenu事件，让MainPage的处理器捕获
      const mainWrapper = document.querySelector('.main-wrapper') as HTMLElement;
      if (mainWrapper) {
        // 创建模拟的MouseEvent
        const mockEvent = new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: Math.max(0, clientX),
          clientY: Math.max(0, clientY),
          button: 2,
          screenX: mouseX || windowPosition.x + clientX,
          screenY: mouseY || windowPosition.y + clientY
        });
        
        // 直接在main-wrapper元素上触发右键事件
        mainWrapper.dispatchEvent(mockEvent);
        info('🎯 已向main-wrapper元素分发右键事件');
      } else {
        warn('未找到main-wrapper元素，尝试在document上触发事件');
        
        // 创建模拟的MouseEvent
        const mockEvent = new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: Math.max(0, clientX),
          clientY: Math.max(0, clientY),
          button: 2
        });
        
        // 分发事件到document
        document.dispatchEvent(mockEvent);
        info('🎯 已向document分发右键事件');
      }
      
      debug('📋 右键菜单事件已触发');
      
    } catch (err) {
      error(`显示右键菜单失败: ${String(err)}`);
    }
  }

  /**
   * 备用鼠标监听方案（当UIohook失败时使用）
   */
  private startFallbackMouseMonitoring(): void {
    info('🔄 启动备用鼠标监听方案');
    
    // 直接在窗口上监听鼠标事件
    document.addEventListener('mousedown', async (event) => {
      try {
        const isLeftClick = event.button === 0;
        const isRightClick = event.button === 2;
        
        // 获取鼠标相对于页面的位置
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        
        // 获取当前窗口位置和鼠标在屏幕上的绝对位置
        const currentWindow = getCurrentWebviewWindow();
        const windowPosition = await currentWindow.outerPosition();
        const screenX = windowPosition.x + mouseX;
        const screenY = windowPosition.y + mouseY;
        
        info(`🖱️ 鼠标点击位置: 页面内(${mouseX}, ${mouseY}) -> 屏幕坐标(${screenX}, ${screenY})`);
        
        // 检查是否在桌宠窗口范围内
        const isOverPet = await this.checkMouseOverPet(screenX, screenY);
        
        if (isLeftClick) {
          info(`🐱 检测到左键点击桌宠 ${isOverPet ? '【在桌宠上】' : '【不在桌宠上】'} - 保持透过状态`);
          // 左键点击时不需要处理，保持默认透过状态即可
        } else if (isRightClick) {
          info(`🐱 检测到右键点击桌宠 ${isOverPet ? '【在桌宠上】' : '【不在桌宠上】'} - 设置为不透过并显示菜单`);
          // 阻止默认右键菜单
          event.preventDefault();
          event.stopPropagation();
          
          await this.handleRightClickOnPet(screenX, screenY);
        }
      } catch (err) {
        error(`备用鼠标事件处理失败: ${String(err)}`);
      }
    });
    
    // 添加鼠标移动监听，仅用于显示状态（不改变透过设置）
    document.addEventListener('mousemove', async (event) => {
      try {
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        
        const currentWindow = getCurrentWebviewWindow();
        const windowPosition = await currentWindow.outerPosition();
        const screenX = windowPosition.x + mouseX;
        const screenY = windowPosition.y + mouseY;
        
        const isOverPet = await this.checkMouseOverPet(screenX, screenY);
        
        // 每秒2秒最多输出一次，避免日志过多
        if (!this.lastMouseMoveLog || Date.now() - this.lastMouseMoveLog > 2000) {
          debug(`📍 鼠标位置: 屏幕(${screenX}, ${screenY}) ${isOverPet ? '【在桌宠上】' : '【不在桌宠上】'}`);
          this.lastMouseMoveLog = Date.now();
        }
        
        // 重要：鼠标移动时不改变透过设置
      } catch (err) {
        // 静默处理移动事件错误，避免日志过多
      }
    });
    
    info('✅ 备用鼠标监听方案启动成功');
  }

  /**
   * 检查鼠标位置是否在桌宠窗口上方
   */
  private async checkMouseOverPet(screenX: number, screenY: number): Promise<boolean> {
    try {
      const currentWindow = getCurrentWebviewWindow();
      const position = await currentWindow.outerPosition();
      const size = await currentWindow.outerSize();
      
      const windowLeft = position.x;
      const windowTop = position.y;
      const windowRight = position.x + size.width;
      const windowBottom = position.y + size.height;
      
      const isOver = screenX >= windowLeft && screenX <= windowRight && 
                     screenY >= windowTop && screenY <= windowBottom;
      
      debug(`📐 桌宠窗口边界: (${windowLeft}, ${windowTop}) 到 (${windowRight}, ${windowBottom})`);
      debug(`📍 鼠标位置: (${screenX}, ${screenY}) -> ${isOver ? '在桌宠上' : '不在桌宠上'}`);
      
      return isOver;
    } catch (err) {
      error(`检查鼠标位置失败: ${String(err)}`);
      return true; // 错误时默认认为在桌宠上
    }
  }

  /**
   * 等待事件传播
   */
  private async waitForEventPropagation(): Promise<void> {
    return new Promise(resolve => {
      // 使用多个动画帧确保充分的时间
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 150); // 适当的延迟时间
        });
      });
    });
  }

  /**
   * 设置窗口点击穿透
   */
  private async setWindowClickThrough(clickThrough: boolean): Promise<void> {
    try {
      if (this.isWindowClickThrough === clickThrough) {
        debug(`窗口透过状态已经是 ${clickThrough}，跳过设置`);
        return;
      }
      
      const currentWindow = getCurrentWebviewWindow();
      await invoke('set_window_click_through', { 
        window: currentWindow,
        clickThrough 
      });
      
      this.isWindowClickThrough = clickThrough;
      info(`🪟 窗口透过状态设置为: ${clickThrough}`);
    } catch (err) {
      error(`设置窗口透过失败: ${String(err)}`);
    }
  }

  /**
   * 获取当前鼠标位置
   */
  async getCurrentMousePosition(): Promise<{ x: number; y: number }> {
    try {
      const [x, y] = await invoke<[number, number]>('get_current_mouse_position');
      debug(`🖱️ 当前鼠标位置: (${x}, ${y})`);
      return { x, y };
    } catch (err) {
      error(`获取鼠标位置失败: ${String(err)}`);
      return { x: 0, y: 0 };
    }
  }

  /**
   * 检查是否正在监听
   */
  isRunning(): boolean {
    return this.isMonitoring;
  }

  /**
   * 销毁管理器
   */
  async destroy(): Promise<void> {
    info('🗑️ 销毁UIohook桌宠管理器');
    
    try {
      await this.stopGlobalMonitoring();
    } catch (err) {
      error(`销毁UIohook管理器时出错: ${String(err)}`);
    }
  }
}

// 全局单例实例
let uiohookPetManager: UiohookPetManager | null = null;

/**
 * 获取UIohook桌宠管理器实例
 */
export function getUiohookPetManager(): UiohookPetManager {
  if (!uiohookPetManager) {
    uiohookPetManager = new UiohookPetManager();
  }
  return uiohookPetManager;
}