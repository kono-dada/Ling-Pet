<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { LogicalSize } from '@tauri-apps/api/dpi';
import Avatar from '../components/main/Avatar.vue';

const avatarRef = ref();

// 设置窗口为正方形
onMounted(async () => {
  const window = getCurrentWebviewWindow();
  const physicalSize = await window.innerSize();
  const scaleFactor = await window.scaleFactor();
  const minSize = Math.min(physicalSize.width, physicalSize.height) / scaleFactor;
  const squaredLogicalSize = new LogicalSize(minSize, minSize);
  window.setSize(squaredLogicalSize);
});

function quitApp() {
  invoke('quit_app')
}
</script>

<template>
  <div class="main-page">
    <Avatar :currentEmotion="'高兴'" ref="avatarRef" />
  </div>
  <v-btn @click="quitApp">退出</v-btn>
</template>

<style scoped>
/* totally transparent, center, no-scrolling */
.main-page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  overscroll-behavior: none;

  /* 防止图片被选中和拖拽 */
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  -webkit-user-drag: none;
  /* 防止图片加载时的闪烁 */
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
}
</style>