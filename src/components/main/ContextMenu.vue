<template>
  <teleport to="body">
    <div
      v-if="isVisible"
      ref="menuRef"
      class="context-menu"
      :style="menuPositionStyle"
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
      <div v-if="showDevTools" class="menu-divider"></div>
      <div v-if="showDevTools" class="menu-item" @click="toggleDevTools">
        <v-icon :size="iconSize" class="menu-icon">mdi-bug-outline</v-icon>
        <span class="menu-text">关闭开发者工具</span>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item" @click="togglePetFixed">
        <v-icon :size="iconSize" class="menu-icon">{{ ac.isPetFixed ? 'mdi-pin-off' : 'mdi-pin' }}</v-icon>
        <span class="menu-text">{{ ac.isPetFixed ? '取消固定' : '固定桌宠' }}</span>
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
import { getPetFixManager } from '../../services/petFixManager'

// 获取外观配置
const ac = useAppearanceConfigStore()
const petFixManager = getPetFixManager()
interface WindowConfig {
  title: string
  url: string
  label: string
  width: number
  height: number
  resizable?: boolean
  transparent?: boolean
  decorations?: boolean
  alwaysOnTop?: boolean
  skipTaskbar?: boolean
  center?: boolean
  visible?: boolean
}

// 创建通用窗口配置
function createWindowConfig(config: Partial<WindowConfig>): WindowConfig {
  return {
    resizable: true,
    transparent: false,
    decorations: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    center: false,
    visible: false,
    ...config
  } as WindowConfig
}

// 通用窗口打开函数
async function openOrCloseWindow(windowLabel: string, windowConfig: WindowConfig) {
  const allWindows = await getAllWebviewWindows()
  const existingWindow = allWindows.find(window => window.label === windowLabel)
  
  if (existingWindow) {
    await existingWindow.close()
    return
  }
  
  new WebviewWindow(windowLabel, windowConfig)
}

// 通用窗口配置接口

// 计算属性：是否显示开发者工具
const showDevTools = computed(() => ac.showDevTools ?? false)

// 组件状态
const isVisible = ref(false)
const menuPosition = ref({ x: 0, y: 0 })
const menuRef = ref<HTMLElement>()

// 合并所有UI尺寸计算到一个计算属性中
const menuStyle = computed(() => {
  // 根据桌宠大小计算缩放因子，范围在 0.7 到 1.2 之间
  const scale = Math.max(0.7, Math.min(1.2, ac.petSize / 200))
  // 基础尺寸：桌宠大小的 80%，但至少 120px，最多 200px
  const baseWidth = Math.max(120, Math.min(200, ac.petSize * 0.8))
  
  return {
    scale,
    fontSize: Math.round(13 * scale),
    iconSize: Math.round(16 * scale),
    padding: Math.round(8 * scale),
    borderRadius: Math.round(8 * scale),
    width: baseWidth
  }
})

// 计算图标尺寸
const iconSize = computed(() => menuStyle.value.iconSize)

// 计算菜单位置和样式
const menuPositionStyle = computed(() => ({
  left: `${menuPosition.value.x}px`,
  top: `${menuPosition.value.y}px`,
  minWidth: `${menuStyle.value.width}px`,
  fontSize: `${menuStyle.value.fontSize}px`,
  borderRadius: `${menuStyle.value.borderRadius}px`,
  '--menu-padding': `${menuStyle.value.padding}px`,
}))

// 显示菜单
const showMenu = async (event: MouseEvent) => {
  // 初始位置设置
  menuPosition.value = {
    x: event.clientX,
    y: event.clientY
  }
  
  isVisible.value = true
  
  // 等待下一帧，确保菜单已渲染
  await nextTick()
  
  // 获取菜单的实际尺寸
  if (menuRef.value) {
    const rect = menuRef.value.getBoundingClientRect()
    const menuWidth = rect.width
    const menuHeight = rect.height
    
    // 重新计算位置，确保不超出屏幕边界
    const maxX = window.innerWidth - menuWidth
    const maxY = window.innerHeight - menuHeight
    
    menuPosition.value = {
      x: Math.min(event.clientX, maxX),
      y: Math.min(event.clientY, maxY)
    }
    
    // 聚焦菜单
    menuRef.value.focus()
  }
}

// 隐藏菜单
const hideMenu = () => {
  isVisible.value = false
  
  // 通知固定桌宠管理器菜单已隐藏
  petFixManager.setContextMenuVisible(false)
}

// 打开设置窗口
const openSettings = async () => {
  hideMenu()
  
  const windowConfig = createWindowConfig({
    title: '设置',
    url: '/#/settings',
    label: 'settings',
    width: 800,
    height: 600
  })
  
  await openOrCloseWindow('settings', windowConfig)
}

// 打开聊天记录窗口
const openChatHistory = async () => {
  hideMenu()
  
  const windowConfig = createWindowConfig({
    title: '聊天记录',
    url: '/#/chat-history',
    label: 'chat-history',
    width: 600,
    height: 700
  })
  
  await openOrCloseWindow('chat-history', windowConfig)
}

// 切换开发者工具
const toggleDevTools = () => {
  hideMenu()
  ac.showDevTools = !ac.showDevTools
}

// 切换固定桌宠
const togglePetFixed = () => {
  hideMenu()
  ac.isPetFixed = !ac.isPetFixed
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