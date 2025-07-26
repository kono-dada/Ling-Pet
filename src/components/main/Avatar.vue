<template>
  <img :src="`/avatar/${state.currentEmotion + '.png'}`" :alt="state.currentEmotion" class="pet-avatar"
    :class="{ 'shaking': isShaking }" draggable="false" @mousedown="onDragStart" @click.stop="onClick" />
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { usePetStateStore } from '../../stores/petState';
import { useConversation } from '../../services/playConversation';

const state = usePetStateStore()
const appWindow = getCurrentWebviewWindow();
const { playNext } = useConversation();

const isShaking = ref(false);

function onDragStart() {
  setTimeout(() => {
    appWindow.startDragging();
  }, 100); // 防止拖拽阻挡点击事件的形成

}

function onClick() {
  playNext();
}

function triggerShakeEffect() {
  isShaking.value = true;
  setTimeout(() => {
    isShaking.value = false;
  }, 1000);
}

watch(() => state.currentEmotion, () => {
  triggerShakeEffect();
});

</script>

<style scoped>
.pet-avatar {
  object-fit: contain;
  border-radius: 50%;
  /* 默认显示轮廓：阴影 + 边框 */
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  border: none;
  transition: all 0.3s ease;
  background: transparent;
  width: 80%;
  cursor: pointer;
  image-rendering: auto; /* 或 smooth，auto 通常效果更好 */
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

.shaking {
  animation: startled 0.6s ease-out;
  transform-origin: center bottom;
}

.pet-avatar:hover {
  transform: scale(1.05);
  transform-origin: center bottom;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  border-color: rgba(255, 255, 255, 1);
}

</style>