<template>
  <teleport to="body">
    <div
      v-if="isVisible"
      ref="menuRef"
      class="context-menu"
      :style="menuStyle"
      @click.stop
      @contextmenu.prevent
    >
      <div class="menu-item" @click="openSettings">
        <v-icon :size="iconSize" class="menu-icon">mdi-cog</v-icon>
        <span class="menu-text">设置</span>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item" @click="openChatHistory">
        <v-icon :size="iconSize" class="menu-icon">mdi-message-text-outline</v-icon>
        <span class="menu-text">查看聊天记录</span>
      </div>
    </div>
    
    <!-- 遮罩层，点击时关闭菜单 -->
    <div
      v-if="isVisible"
      class="context-menu-overlay"
      @click="hideMenu"
      @contextmenu.prevent="hideMenu"
    ></div>
  </teleport>
</template>

<script lang="ts" setup>
import { ref, computed, nextTick } from 'vue'
import { getAllWebviewWindows, WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useAppearanceConfigStore } from '../../stores/configs/appearanceConfig'

// 获取外观配置
const ac = useAppearanceConfigStore()

// 组件状态
const isVisible = ref(false)
const menuPosition = ref({ x: 0, y: 0 })
const menuRef = ref<HTMLElement>()

// 根据桌宠大小计算菜单尺寸
const menuDimensions = computed(() => {
  // 基础尺寸：桌宠大小的 80%，但至少 120px，最多 200px
  const baseWidth = Math.max(120, Math.min(200, ac.petSize * 0.8))
  const baseHeight = Math.max(80, Math.min(120, ac.petSize * 0.4))
  
  return {
    width: baseWidth,
    height: baseHeight
  }
})

// 根据桌宠大小计算字体和图标尺寸
const scaleFactors = computed(() => {
  // 根据桌宠大小计算缩放因子，范围在 0.7 到 1.2 之间
  const scale = Math.max(0.7, Math.min(1.2, ac.petSize / 200))
  
  return {
    fontSize: Math.round(13 * scale),
    iconSize: Math.round(16 * scale),
    padding: Math.round(8 * scale),
    borderRadius: Math.round(8 * scale)
  }
})

// 计算图标尺寸
const iconSize = computed(() => scaleFactors.value.iconSize)

// 计算菜单位置样式
const menuStyle = computed(() => ({
  left: `${menuPosition.value.x}px`,
  top: `${menuPosition.value.y}px`,
  minWidth: `${menuDimensions.value.width}px`,
  fontSize: `${scaleFactors.value.fontSize}px`,
  borderRadius: `${scaleFactors.value.borderRadius}px`,
  '--menu-padding': `${scaleFactors.value.padding}px`,
}))

// 显示菜单
const showMenu = async (event: MouseEvent) => {
  // 使用响应式的菜单尺寸
  const menuWidth = menuDimensions.value.width
  const menuHeight = menuDimensions.value.height
  const maxX = window.innerWidth - menuWidth
  const maxY = window.innerHeight - menuHeight
  
  menuPosition.value = {
    x: Math.min(event.clientX, maxX),
    y: Math.min(event.clientY, maxY)
  }
  
  isVisible.value = true
  
  // 等待下一帧，确保菜单已渲染，然后聚焦
  await nextTick()
  menuRef.value?.focus()
}

// 隐藏菜单
const hideMenu = () => {
  isVisible.value = false
}

// 打开设置窗口
const openSettings = async () => {
  hideMenu()
  
  const allWindows = await getAllWebviewWindows()
  const settingsWindow = allWindows.find(window => window.label === 'settings')
  
  if (settingsWindow) {
    await settingsWindow.close()
    return
  }
  
  const settingWindowConfig = {
    title: '设置',
    url: '/#/settings',
    label: 'settings',
    width: 800,
    height: 600,
    resizable: true,
    transparent: false,
    decorations: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    center: false,
    visible: false,
  }
  
  new WebviewWindow('settings', settingWindowConfig)
}

// 打开聊天记录窗口
const openChatHistory = async () => {
  hideMenu()
  
  const allWindows = await getAllWebviewWindows()
  const chatHistoryWindow = allWindows.find(window => window.label === 'chat-history')
  
  if (chatHistoryWindow) {
    await chatHistoryWindow.close()
    return
  }
  
  const chatHistoryWindowConfig = {
    title: '聊天记录',
    url: '/#/chat-history',
    label: 'chat-history',
    width: 600,
    height: 700,
    resizable: true,
    transparent: false,
    decorations: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    center: false,
    visible: false,
  }
  
  new WebviewWindow('chat-history', chatHistoryWindowConfig)
}

// 导出方法供父组件使用
defineExpose({
  showMenu,
  hideMenu
})
</script>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 9999;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  padding: 4px;
  outline: none;
  user-select: none;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: var(--menu-padding, 8px) calc(var(--menu-padding, 8px) * 1.5);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  color: #333;
  white-space: nowrap;
}

.menu-item:hover {
  background: rgba(25, 118, 210, 0.08);
  color: #1976d2;
}

.menu-icon {
  margin-right: calc(var(--menu-padding, 8px));
  opacity: 0.8;
  flex-shrink: 0;
}

.menu-text {
  font-weight: 500;
}

.menu-divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.1);
  margin: 4px calc(var(--menu-padding, 8px));
}

.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9998;
  background: transparent;
}

/* 暗色主题适配 */
@media (prefers-color-scheme: dark) {
  .context-menu {
    background: rgba(33, 33, 33, 0.95);
    border-color: rgba(255, 255, 255, 0.1);
  }
  
  .menu-item {
    color: #e0e0e0;
  }
  
  .menu-item:hover {
    background: rgba(33, 150, 243, 0.12);
    color: #64b5f6;
  }
  
  .menu-divider {
    background: rgba(255, 255, 255, 0.1);
  }
}
</style>