<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { LogicalSize } from '@tauri-apps/api/dpi';
import Avatar from '../components/main/Avatar.vue';
import Input from '../components/main/Input.vue';
import SettingButton from '../components/main/SettingButton.vue';

const avatarRef = ref();

// 设置窗口为正方形
async function setWindowToSquare() {
  const window = getCurrentWebviewWindow();
  const physicalSize = await window.innerSize();
  const scaleFactor = await window.scaleFactor();
  const minSize = Math.min(physicalSize.width, physicalSize.height) / scaleFactor;
  const squaredLogicalSize = new LogicalSize(minSize, minSize);
  window.setSize(squaredLogicalSize);
}

onMounted(async () => {
  await setWindowToSquare();
});

function quitApp() {
  invoke('quit_app')
}
</script>

<template>
  <div class="main-wrapper">
    <Avatar ref="avatarRef" />
    <SettingButton class="settings-button" />
    <Input class="input" />
  </div>
  <v-btn @click="quitApp">退出</v-btn>
</template>

<style scoped>
/* totally transparent, center, no-scrolling */
.main-wrapper {
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
  padding: 5px;

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


.main-wrapper:hover .input,
.main-wrapper:focus-within .input {
  opacity: 0.6;
}
.main-wrapper:hover .settings-button,
.main-wrapper:focus-within .settings-button {
  opacity: 1;
}
</style>