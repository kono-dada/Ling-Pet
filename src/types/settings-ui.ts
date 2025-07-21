/**
 * @fileoverview 设置UI相关类型定义
 * @description 定义设置界面组件的类型，提供UI状态管理的类型安全
 * @interfaces
 *   - SettingsTab: 设置标签页接口 (ID、名称、图标、组件)
 *   - SettingsState: 设置页面状态接口 (活跃标签、加载状态)
 *   - AIConfigForm: AI配置表单类型
 *   - SettingsFormState: 表单状态管理
 * @components
 *   - 标签页导航系统
 *   - 表单状态管理
 *   - 加载和错误状态
 * @usage
 *   import type { SettingsTab, SettingsState } from '@/types/settings-ui'
 * @author dada
 * @version 1.0.0
 * @since 2025-07-13
 */

// 设置页面相关类型定义
export interface SettingsTab {
  id: string;
  name: string;
  icon: string;
  component?: string;
}

export interface SettingsState {
  activeTab: string;
  isLoading: boolean;
}

// AI配置表单类型
export interface AIConfigForm {
  apiKey: string;
  baseURL: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

// 设置验证结果
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}
