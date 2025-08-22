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
        <v-icon size="16" class="menu-icon">mdi-cog</v-icon>
        <span class="menu-text">设置</span>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item" @click="openChatHistory">
        <v-icon size="16" class="menu-icon">mdi-message-text-outline</v-icon>
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

// 组件状态
const isVisible = ref(false)
const menuPosition = ref({ x: 0, y: 0 })
const menuRef = ref<HTMLElement>()

// 计算菜单位置样式
const menuStyle = computed(() => ({
  left: `${menuPosition.value.x}px`,
  top: `${menuPosition.value.y}px`,
}))

// 显示菜单
const showMenu = async (event: MouseEvent) => {
  // 确保菜单在屏幕范围内
  const menuWidth = 160
  const menuHeight = 80
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
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  min-width: 160px;
  padding: 4px;
  outline: none;
  user-select: none;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  color: #333;
  font-size: 13px;
}

.menu-item:hover {
  background: rgba(25, 118, 210, 0.08);
  color: #1976d2;
}

.menu-icon {
  margin-right: 8px;
  opacity: 0.8;
}

.menu-text {
  font-weight: 500;
}

.menu-divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.1);
  margin: 4px 8px;
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