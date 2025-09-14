/**
 * @fileoverview 桌宠固定功能管理器 - 基于UIohook-rs实现
 * @description 管理桌宠的固定状态，使用UIohook-rs进行全局鼠标监听
 * @author AI Assistant
 * @version 2.0.0
 */

import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { debug, info, warn, error } from '@tauri-apps/plugin-log';
import { getUiohookPetManager, type GlobalMouseEvent } from './uiohookPetManager';

export interface MouseEventData {
  x: number;
  y: number;
  button: 'left' | 'right';
  window_handle?: number;
}

export class PetFixManager {
  private isHookActive = false;
  private isWindowClickThrough = false;
  private uiohookManager = getUiohookPetManager();
  private onMouseEvent?: (event: MouseEventData) => void;
  private contextMenuVisible = false;

  constructor() {
    info('🚀 初始化桌宠固定功能管理器 (UIohook版本)');
  }

  /**
   * 启动固定桌宠功能 - UIohook版本
   */
  async startPetFix(): Promise<void> {
    try {
      info('🎆 启动UIohook桌宠固定功能');
      
      if (this.isHookActive) {
        warn('桌宠固定功能已经在运行中');
        return;
      }

      // 启动UIohook全局监听
      await this.uiohookManager.startGlobalMonitoring();
      
      this.isHookActive = true;
      
      info('✅ UIohook桌宠固定功能启动成功');
    } catch (err) {
      error(`启动UIohook桌宠固定功能失败: ${String(err)}`);
      throw err;
    }
  }

  /**
   * 停止固定桌宠功能 - UIohook版本
   */
  async stopPetFix(): Promise<void> {
    try {
      info('🛑 停止UIohook桌宠固定功能');
      
      if (!this.isHookActive) {
        debug('桌宠固定功能未运行，无需停止');
        return;
      }

      // 停止UIohook全局监听
      await this.uiohookManager.stopGlobalMonitoring();
      
      // 确保窗口不可透过
      await this.setWindowClickThrough(false);
      
      this.isHookActive = false;
      
      info('✅ UIohook桌宠固定功能停止成功');
    } catch (err) {
      error(`停止UIohook桌宠固定功能失败: ${String(err)}`);
      throw err;
    }
  }

  /**
   * 设置右键菜单可见状态 - UIohook版本
   */
  setContextMenuVisible(visible: boolean): void {
    debug(`设置右键菜单可见性: ${visible}`);
    this.contextMenuVisible = visible;
    
    // UIohook版本不需要特别处理菜单状态，
    // 因为UIohook会自动处理透过逻辑
    if (visible) {
      info('右键菜单已显示');
    } else {
      info('右键菜单已关闭');
    }
  }

  /**
   * 设置鼠标事件回调
   */
  setMouseEventCallback(callback: (event: MouseEventData) => void): void {
    debug('设置鼠标事件回调函数');
    this.onMouseEvent = callback;
  }

  /**
   * 获取Hook状态
   */
  async getHookStatus(): Promise<boolean> {
    try {
      const status = this.uiohookManager.isRunning();
      debug(`UIohook状态: ${status}`);
      return status;
    } catch (err) {
      error(`获取UIohook状态失败: ${String(err)}`);
      return false;
    }
  }

  /**
   * 获取当前鼠标位置
   */
  async getMousePosition(): Promise<{ x: number; y: number }> {
    try {
      const position = await this.uiohookManager.getCurrentMousePosition();
      debug(`当前鼠标位置: (${position.x}, ${position.y})`);
      return position;
    } catch (err) {
      error(`获取鼠标位置失败: ${String(err)}`);
      return { x: 0, y: 0 };
    }
  }

  /**
   * 检查鼠标是否在桌宠窗口内
   */
  async isMouseOverPet(): Promise<boolean> {
    try {
      const currentWindow = getCurrentWebviewWindow();
      const position = await currentWindow.outerPosition();
      const size = await currentWindow.outerSize();
      const mousePos = await this.getMousePosition();
      
      const isOver = mousePos.x >= position.x && 
                     mousePos.x <= position.x + size.width &&
                     mousePos.y >= position.y && 
                     mousePos.y <= position.y + size.height;
      
      debug(`鼠标位置: (${mousePos.x}, ${mousePos.y}), 窗口区域: (${position.x}, ${position.y}) - (${position.x + size.width}, ${position.y + size.height}), 是否在桌宠上: ${isOver}`);
      return isOver;
    } catch (err) {
      error(`检查鼠标位置失败: ${String(err)}`);
      return false;
    }
  }

  /**
   * 设置窗口点击穿透
   */
  private async setWindowClickThrough(clickThrough: boolean): Promise<void> {
    try {
      if (this.isWindowClickThrough === clickThrough) {
        debug(`窗口点击穿透状态已经是 ${clickThrough}，跳过设置`);
        return;
      }
      
      const currentWindow = getCurrentWebviewWindow();
      await invoke('set_window_click_through', { 
        window: currentWindow,
        clickThrough 
      });
      
      this.isWindowClickThrough = clickThrough;
      info(`🪟 窗口点击穿透设置为: ${clickThrough}`);
    } catch (err) {
      error(`设置窗口点击穿透失败: ${String(err)}`);
    }
  }

  /**
   * 销毁管理器
   */
  async destroy(): Promise<void> {
    info('🗑️ 销毁桌宠固定功能管理器');
    
    try {
      await this.stopPetFix();
    } catch (err) {
      error(`销毁管理器时出错: ${String(err)}`);
    }
  }
}

// 全局单例实例
let petFixManager: PetFixManager | null = null;

/**
 * 获取桌宠固定功能管理器实例
 */
export function getPetFixManager(): PetFixManager {
  if (!petFixManager) {
    petFixManager = new PetFixManager();
  }
  return petFixManager;
}