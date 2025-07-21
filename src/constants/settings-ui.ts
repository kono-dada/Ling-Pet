/**
 * @fileoverview 设置UI相关常量定义
 * @description 定义设置界面的UI常量，包含标签页配置、图标、默认状态等
 * @constants
 *   - SETTINGS_TABS: 设置标签页配置数组
 *   - DEFAULT_ACTIVE_TAB: 默认激活的标签页ID
 * @tabs
 *   - appearance: 外观设置 (宠物大小、透明度、边框)
 *   - ai: AI设置 (API配置、模型选择、对话参数)
 *   - about: 关于页面 (应用信息、版本、帮助)
 * @usage
 *   import { SETTINGS_TABS, DEFAULT_ACTIVE_TAB } from '@/constants/settings-ui'
 * @author dada
 * @version 1.0.0
 * @since 2025-07-13
 */

// 设置页面相关常量
import type { SettingsTab } from '../types/settings-ui';

export const SETTINGS_TABS: SettingsTab[] = [
  {
    id: 'appearance',
    name: '外观设置',
    icon: 'appearance',
  },
  {
    id: 'ai',
    name: 'AI设置',
    icon: 'ai',
  },
  {
    id: 'about',
    name: '关于',
    icon: 'about',
  },
];

export const DEFAULT_ACTIVE_TAB = 'appearance';
