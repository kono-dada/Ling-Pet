<template>
  <div class="chat-bubble-window">
    <div class="bubble-container">
      <div class="bubble-content" :style="bubbleStyles">
        <div class="bubble-text" :style="{ textAlign, color: colorTheme.text }">
          {{ displayedMessage }}<span v-if="isTyping" class="typing-cursor" :style="{ color: colorTheme.text }">|</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { getEmotionColorTheme } from '../constants/emotionColors';
import { useChatBubbleStateStore } from '../stores/chatBubbleState';
import { useStateStore } from '../stores/petState';
import { getCurrentWebviewWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi';
import { debug } from '@tauri-apps/plugin-log';

const cbs = useChatBubbleStateStore();
cbs.$tauri.start();
const petState = useStateStore();

const displayedMessage = ref('');
const isTyping = ref(false);
const textAlign = ref<'center' | 'left'>('center');

// 计算颜色主题
const colorTheme = computed(() => getEmotionColorTheme(petState.currentEmotion))

// 计算气泡样式
const bubbleStyles = computed(() => {
  const theme = colorTheme.value;
  return {
    background: theme.background,
    borderColor: theme.border,
    boxShadow: `0 8px 32px ${theme.shadow}, 0 0 0 1px ${theme.border}`,
    color: theme.text,
    // 设置 CSS 变量用于动画
    '--dynamic-shadow': `0 8px 32px ${theme.shadow}`,
    '--glow-color': theme.shadow,
    '--border-glow': theme.border
  };
});

// 打字机效果
const typeMessage = async (message: string) => {
  const typeSpeed = 50
  if (!message) return;

  // 根据文字长度决定对齐方式
  textAlign.value = message.length > 30 ? 'left' : 'center';

  isTyping.value = true;
  displayedMessage.value = '';

  for (let i = 0; i <= message.length; i++) {
    displayedMessage.value = message.slice(0, i);
    await new Promise(resolve => setTimeout(resolve, typeSpeed)); 
  }

  isTyping.value = false;
};

// 监听消息变化
watch(() => cbs.currentMessage, (newMessage) => {
  debug(`cb检测到新消息：${newMessage}`);
  resizeAndPositionBubble();
  typeMessage(newMessage);
}, { immediate: true });

async function calculateBubbleWindowProps(mainWindow: WebviewWindow, message: string) {
  // 获取主窗口信息
  const [mainPosition, mainSize, scaleFactor] = await Promise.all([
    mainWindow.innerPosition(),
    mainWindow.innerSize(),
    mainWindow.scaleFactor()
  ]);

  // 根据消息长度动态计算气泡尺寸
  const messageLength = message.length;
  const bubbleWidth = 250;

  // 根据消息长度估算高度（考虑换行）
  const estimatedLines = Math.ceil(messageLength / 10);
  const bubbleHeight = Math.min(Math.max(estimatedLines * 24 + 60, 80), 250);

  // 将物理坐标转换为逻辑坐标
  const logicalMainX = mainPosition.x / scaleFactor;
  const logicalMainY = mainPosition.y / scaleFactor;
  const logicalMainWidth = mainSize.width / scaleFactor;
  const logicalMainHeight = mainSize.height / scaleFactor;

  // 计算气泡逻辑位置：主窗口正左方
  const bubbleX = logicalMainX + logicalMainWidth / 3 - bubbleWidth; // 右侧留出10px
  const bubbleY = logicalMainY + logicalMainHeight / 2 - bubbleHeight / 2;
  return {
    width: bubbleWidth,
    height: bubbleHeight,
    x: bubbleX,
    y: bubbleY,
  };
}

async function resizeAndPositionBubble() {
  const chatBubbleWindow = getCurrentWebviewWindow();
  const mainWindow = await WebviewWindow.getByLabel('main');
  if (chatBubbleWindow && mainWindow) {
    const props = await calculateBubbleWindowProps(mainWindow, cbs.currentMessage);
    await chatBubbleWindow.setSize(new LogicalSize(props.width, props.height));
    await chatBubbleWindow.setPosition(new LogicalPosition(props.x, props.y));
  }
}

onMounted(async () => {
  const chatBubbleWindow = getCurrentWebviewWindow();
  chatBubbleWindow.setAlwaysOnTop(true)
  const mainWindow = await WebviewWindow.getByLabel('main');
  resizeAndPositionBubble()  //无论是生成还是更新消息，都需要重新计算位置
  mainWindow?.onMoved(async () => {
    if (chatBubbleWindow) {
      const props = await calculateBubbleWindowProps(mainWindow, cbs.currentMessage);
      chatBubbleWindow.setPosition(new LogicalPosition(props.x, props.y));
    }
  });
});

</script>

<style scoped>
.chat-bubble-window {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
  /* 固定在底部 */
  justify-content: center;
  background: transparent;
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  padding-bottom: 5px;
  /* 为尾巴留出空间 */
}

.bubble-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: bubbleAppear 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  z-index: 999999;
  /* 确保在最上层 */
  width: 100%;
}

.bubble-content {
  /* 毛玻璃背景效果 - 将通过内联样式动态设置背景色 */
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);

  /* 边框和阴影 - 将通过内联样式动态设置 */
  border: 1px solid transparent;
  border-radius: 20px;

  position: relative;
  z-index: 1000000;
  width: 200px;
  /* 固定宽度 */
  min-width: 200px;

  /* 添加呼吸闪烁动画 */
  animation: breathingGlow 4s ease-in-out infinite;

  /* 确保渐变与动态背景色兼容 */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.bubble-text {
  /* 文本样式 */
  color: #1a1a1a;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
  padding: 14px 18px;
  word-wrap: break-word;
  word-break: break-word;
  /* 确保长单词能被正确换行 */
  white-space: pre-wrap;
  /* 保留换行符和空格 */

  /* 滚动支持 */
  max-height: 200px;
  /* 增加最大高度 */
  overflow-y: auto;

  /* 高清文本渲染 */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-feature-settings: "liga", "kern";

  /* 文本阴影增强可读性 */
  text-shadow: 0 0.5px 1px rgba(255, 255, 255, 0.8);
}

/* 打字机光标 */
.typing-cursor {
  animation: blink 1s infinite;
  color: #1a1a1a;
  font-weight: 400;
}

/* 自定义滚动条样式 */
.bubble-text::-webkit-scrollbar {
  width: 4px;
}

.bubble-text::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
}

.bubble-text::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 2px;
}

.bubble-text::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.5);
}

/* 光标闪烁动画 */
@keyframes blink {

  0%,
  50% {
    opacity: 1;
  }

  51%,
  100% {
    opacity: 0;
  }
}

/* 呼吸闪烁动画 */
@keyframes breathingGlow {
  0% {
    transform: scale(1);
    filter: brightness(1) saturate(1);
    box-shadow: var(--dynamic-shadow, 0 8px 32px rgba(0, 0, 0, 0.15));
  }

  25% {
    transform: scale(1.015);
    filter: brightness(1.05) saturate(1.1);
    box-shadow: var(--dynamic-shadow, 0 8px 32px rgba(0, 0, 0, 0.15)),
      0 0 20px var(--glow-color, rgba(0, 0, 0, 0.1));
  }

  50% {
    transform: scale(1.03);
    filter: brightness(1.1) saturate(1.2);
    box-shadow: var(--dynamic-shadow, 0 8px 32px rgba(0, 0, 0, 0.15)),
      0 0 30px var(--glow-color, rgba(0, 0, 0, 0.15)),
      0 0 15px var(--glow-color, rgba(0, 0, 0, 0.1));
  }

  75% {
    transform: scale(1.015);
    filter: brightness(1.05) saturate(1.1);
    box-shadow: var(--dynamic-shadow, 0 8px 32px rgba(0, 0, 0, 0.15)),
      0 0 20px var(--glow-color, rgba(0, 0, 0, 0.1));
  }

  100% {
    transform: scale(1);
    filter: brightness(1) saturate(1);
    box-shadow: var(--dynamic-shadow, 0 8px 32px rgba(0, 0, 0, 0.15));
  }
}

/* 气泡出现动画 */
@keyframes bubbleAppear {
  0% {
    opacity: 0;
    transform: scale(0.2) translateY(30px);
    filter: blur(2px);
  }

  30% {
    opacity: 0.6;
    transform: scale(0.8) translateY(10px);
    filter: blur(1px);
  }

  60% {
    opacity: 0.9;
    transform: scale(1.1) translateY(-5px);
    filter: blur(0px);
  }

  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
    filter: blur(0px);
  }
}

/* 气泡消失动画 */
@keyframes bubbleDisappear {
  0% {
    opacity: 1;
    transform: scale(1) translateY(0);
    filter: blur(0px);
  }

  100% {
    opacity: 0;
    transform: scale(0.7) translateY(-15px);
    filter: blur(1px);
  }
}

.bubble-container.disappearing {
  animation: bubbleDisappear 0.25s ease-in-out;
}

/* 响应式文本大小 */
@media (max-width: 200px) {
  .bubble-content {
    font-size: 13px;
    padding: 12px 16px;
  }
}

/* 高DPI屏幕优化 */
@media (-webkit-min-device-pixel-ratio: 2) {
  .bubble-content {
    font-weight: 400;
    letter-spacing: 0.1px;
  }
}
</style>
