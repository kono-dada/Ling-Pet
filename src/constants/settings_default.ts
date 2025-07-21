/**
 * @fileoverview 设置相关常量定义
 * @description 定义设置的默认值和限制范围，提供设置相关的常量配置
 * @constants
 *   - SETTINGS_CONSTRAINTS: 设置约束条件 (最小/最大值限制)
 *   - DEFAULT_SETTINGS: 默认设置值
 * @ranges
 *   - 宠物大小: 100-300px
 *   - 透明度: 0.1-1.0 (10%-100%)
 *   - 边框显示: true (默认显示)
 * @usage
 *   import { DEFAULT_SETTINGS, SETTINGS_CONSTRAINTS } from '@/constants/settings'
 * @author dada
 * @version 1.0.0
 * @since 2025-07-13
 */

// 设置默认值和限制常量
import type { AppSetting, SettingsConstraints } from '../types/settings';
import { DEFAULT_CHARACTER_PROMPT } from './ai';

export const SETTINGS_CONSTRAINTS: SettingsConstraints = {
  minSize: 100,
  maxSize: 300,
  minOpacity: 0.1,
  maxOpacity: 1.0,
};

export const DEFAULT_SETTINGS: AppSetting = {
  appearance: {
    pet_size: 150,
    pet_opacity: 1.0,
    pet_show_border: true,
  },
  ai: {
    api_key: '',
    base_url: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    temperature: 0.7,
    max_tokens: 2000,
    system_prompt: DEFAULT_CHARACTER_PROMPT,
  },
  window: {
  main_window_x: 100,
  main_window_y: 100,
  },
};
