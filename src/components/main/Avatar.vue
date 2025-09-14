<template>
  <div class="avatar-wrapper">
    <!-- Thinking bubble in top-left when streaming -->
    <div v-if="conversation.isStreaming" class="thinking-bubble" aria-label="thinking">
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </div>

    <div class="avatar-border">
      <div class="avatar-anim" :class="{ shaking: isShaking, breathing: !isShaking }">
        <img 
          v-show="isReady" 
          :src="emotionSrc" 
          :alt="codeToEmotion(state.currentEmotion)" 
          class="pet-avatar" 
          draggable="false"
          @load="onImgLoad" 
          @error="onImgError" 
          @mousedown="onDragStart" 
          @click.stop="onClick" 
        />
      </div>
    </div>
    <div v-if="!isReady" class="avatar-loading">首次加载，请稍等……</div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, computed, onMounted } from 'vue';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { usePetStateStore } from '../../stores/petState';
import { codeToEmotion } from '../../constants/emotions';
import { getEmotionImageSrcByCode } from '../../services/emotionPack'
import { useConversationStore } from '../../stores/conversation';
import { registerAvatarClick } from '../../services/interactions/avatarMultiClickEmitter';
import { useAppearanceConfigStore } from '../../stores/configs/appearanceConfig'
import { useMemoryStore } from '../../stores/memory';

const state = usePetStateStore()
const appWindow = getCurrentWebviewWindow();
const conversation = useConversationStore();

const isShaking = ref(false);
const isReady = ref(false);

// 依赖 store 中的版本号和当前包名（服务内部会附加 v/pack 查询参数）
const ac = useAppearanceConfigStore()
const emotionSrc = computed(() => {
  try {
    // 建立依赖：当包名或版本变化时重新计算
    void ac.activeEmotionPackName
    void ac.emotionPackVersion
    return getEmotionImageSrcByCode(state.currentEmotion)
  } catch (error) {
    console.warn('获取表情图片路径失败:', error)
    // 在资源尚未就绪时返回空字符串，保持占位视图
    return ''
  }
})

/**
 * 图片加载成功回调
 */
function onImgLoad() {
  isReady.value = true;
}

/**
 * 图片加载失败回调
 */
function onImgError() {
  isReady.value = false;
  console.warn('表情图片加载失败')
}

/**
 * 拖拽开始处理
 */
function onDragStart(e: MouseEvent) {
  // 仅在按下主键时启用拖拽判定
  if ((e.buttons & 1) === 0) return;

  const startX = e.clientX;
  const startY = e.clientY;
  let started = false;

  const DRAG_THRESHOLD = 5; // 像素，避免点击触发拖拽

  const onMove = (ev: MouseEvent) => {
    if (started) return;
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
      started = true;
      // 必须在鼠标事件回调同步调用，macOS 上否则会因为没有当前事件而崩溃
      // 不要使用 setTimeout，否则会触发 tao objc2 "message to nil" 崩溃
      void appWindow.startDragging();
      cleanup();
    }
  };

  const onUp = () => cleanup();

  function cleanup() {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  }

  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp, { once: true });
}

/**
 * 点击事件处理
 */
function onClick() {
  // 取消可能存在的自动播放定时器
  conversation.cancelAutoPlay();

  state.updateLastClickTimestamp();
  conversation.playNext();
  registerAvatarClick();
}

/**
 * 触发摇晃效果
 */
function triggerShakeEffect() {
  isShaking.value = true;
  setTimeout(() => {
    isShaking.value = false;
  }, 1000);
}

// 监听表情变化，触发摇晃效果
watch(() => state.currentEmotion, () => {
  triggerShakeEffect();
});

onMounted(() => {
  // 首次启动时的欢迎对话
  setTimeout(() => {
    if (useMemoryStore().firstLaunch) {
      [
        {
          message: '你好呀，初次见面~',
          emotion: 10,
          japanese: 'こんにちは〜',
        },
        {
          message: '我叫钦灵，从今天开始我就住在你的电脑里了……',
          emotion: 17,
          japanese: '私はりんと申します。今日からあなたのパートナーになります。',
        },
        {
          message: '你可以叫我灵灵',
          emotion: 8,
          japanese: 'りんりんと呼んでください。',
        },
        {
          message: '你呢？如果能告诉我你的名字的话，我会很开心的~',
          emotion: 10,
          japanese: '差し支えなければ、あなたのお名前を教えていただけますか？',
        }
      ].forEach(item => {
        conversation.addItem(item);
      });
    }
    useMemoryStore().firstLaunch = false;
  }, 2000);
  
  // 触发一次点击事件，确保 avatarMultiClickEmitter 已经注册
  setTimeout(() => {
    conversation.cancelInactivityWatch()
  }, 6000);
});
</script>

<style scoped>
.avatar-wrapper {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  --glow-color: 80 180 255;
  /* RGB values, e.g., cyan-blue */
}

.avatar-border {
  border-radius: 50%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  border: none;
  background: transparent;
  width: 80%;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.avatar-anim {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  will-change: transform;
}

/* 一惊一乍的伸缩动画 */
@keyframes startled {
  0% {
    transform: scaleY(1) scaleX(1);
  }

  20% {
    transform: scaleY(0.9) scaleX(1.05);
  }

  40% {
    transform: scaleY(1.1) scaleX(0.95);
  }

  60% {
    transform: scaleY(0.95) scaleX(1.02);
  }

  80% {
    transform: scaleY(1.1) scaleX(0.98);
  }

  100% {
    transform: scaleY(1.05) scaleX(1.05);
  }
}

@keyframes breathe {

  0%,
  100% {
    transform: scaleX(1) scaleY(1) translateY(0);
  }

  50% {
    transform: scaleX(1.02) scaleY(1.02) translateY(-2px);
  }
}

.shaking {
  animation: startled 0.6s ease-out;
  transform-origin: center bottom;
}

.breathing {
  animation: breathe 6s ease-in-out infinite;
  transform-origin: center bottom;
}

.pet-avatar {
  object-fit: contain;
  width: 100%;
  cursor: pointer;
  image-rendering: auto;
  /* 或 smooth，auto 通常效果更好 */
  filter: drop-shadow(0 0 6px rgb(var(--glow-color) / 0.6)) drop-shadow(0 0 12px rgb(var(--glow-color) / 0.35));
  transition: filter 0.2s ease;
}

.avatar-loading {
  width: 80%;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  background: rgba(0, 0, 0, 0.4);
  /* 灰色半透明背景 */
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  user-select: none;
}

.avatar-border:hover {
  transform: scale(1.05);
  transform-origin: center bottom;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}

.avatar-border:hover .pet-avatar {
  filter: drop-shadow(0 0 8px rgb(var(--glow-color) / 0.75)) drop-shadow(0 0 18px rgb(var(--glow-color) / 0.5));
}

/* Thinking bubble - scales with parent */
.thinking-bubble {
  position: absolute;
  top: 10%;
  left: 10%;
  width: 30%;
  height: 18%;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(4px);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10%;
  z-index: 2;
  pointer-events: none;
  /* do not block clicks */
}

.thinking-bubble .dot {
  width: 12%;
  height: 26%;
  border-radius: 50%;
  background: black;
  opacity: 0.35;
  animation: bubblePulse 1.2s infinite ease-in-out;
}

.thinking-bubble .dot:nth-child(2) {
  animation-delay: 0.15s;
}

.thinking-bubble .dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes bubblePulse {
  0% {
    opacity: 0.25;
    transform: translateY(0) scale(0.9);
  }

  30% {
    opacity: 1;
    transform: translateY(-6%) scale(1.05);
  }

  60% {
    opacity: 0.6;
    transform: translateY(0) scale(0.95);
  }

  100% {
    opacity: 0.25;
    transform: translateY(0) scale(0.9);
  }
}
</style>