<template>
  <img :src="`/avatar/${currentEmotion + '.png'}`" :alt="currentEmotion" class="pet-avatar"
    :class="{ 'shaking': isShaking }" draggable="false" @mousedown="onDragStart" />
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

const appWindow = getCurrentWebviewWindow();

const props = defineProps<{
  currentEmotion: string;
}>();

const isShaking = ref(false);

function onDragStart() {
  appWindow.startDragging();
}

function triggerShakeEffect() {
  isShaking.value = true;
  setTimeout(() => {
    isShaking.value = false;
  }, 600);
}

watch(() => props.currentEmotion, () => {
  triggerShakeEffect();
});

defineExpose({
  triggerShakeEffect
});

</script>

<style scoped>
.pet-avatar {
  object-fit: contain;
  border-radius: 50%;
  /* 默认显示轮廓：阴影 + 边框 */
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.15);
  border: none;
  transition: all 0.3s ease;
  background: transparent;
  width: 100%;
  height: 100%;
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
    transform: scaleY(1.05) scaleX(0.98);
  }

  100% {
    transform: scaleY(1) scaleX(1);
  }
}

.shaking {
  animation: startled 0.6s ease-out;
  transform-origin: center bottom;
}
</style>