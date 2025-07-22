<script setup lang="ts">
import { onMounted, ref, watchEffect, nextTick } from 'vue';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { LogicalSize } from '@tauri-apps/api/dpi';
import Avatar from '../components/main/Avatar.vue';
import Input from '../components/main/Input.vue';
import SettingButton from '../components/main/SettingButton.vue';
import decorations from '../components/main/decorations.vue';
import { useAppearanceConfigStore } from '../stores/appearanceConfig';

const avatarRef = ref();
const ac = useAppearanceConfigStore();
const window = getCurrentWebviewWindow();

// 设置窗口为正方形
async function setWindowToSquare() {
  window.setSize(new LogicalSize(ac.petSize, ac.petSize + 30));
}

onMounted(async () => {
  await setWindowToSquare();
  watchEffect(async () => {  // 监听 petSize 的变化， 确保窗口大小同步更新
    await window.setSize(new LogicalSize(ac.petSize, ac.petSize + 30));
    // 触发装饰元素的重新渲染，否则位置会出问题
    if (ac.showDecorations) {
      ac.showDecorations = false;
      await nextTick();
      ac.showDecorations = true; 
    }
  });
});

</script>

<template>
  <div 
    class="main-wrapper" 
    :style="{ opacity: ac.opacity }"
    @wheel.prevent 
  >  <!-- 防止滚轮事件导致滚动 -->
    <decorations />
    <Avatar ref="avatarRef" />
    <SettingButton class="settings-button" />
    <Input class="input" />
  </div>
</template>

<style scoped>
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
  opacity: 0.95;
}

.main-wrapper:hover .settings-button,
.main-wrapper:focus-within .settings-button {
  opacity: 1;
}
</style>