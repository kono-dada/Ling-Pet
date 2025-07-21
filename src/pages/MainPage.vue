<script setup lang="ts">
import { onMounted, ref, watchEffect } from 'vue';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { LogicalSize } from '@tauri-apps/api/dpi';
import Avatar from '../components/main/Avatar.vue';
import Input from '../components/main/Input.vue';
import SettingButton from '../components/main/SettingButton.vue';
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
  watchEffect(async () => {
    await window.setSize(new LogicalSize(ac.petSize, ac.petSize + 30));
  });
});

</script>

<template>
  <div class="main-wrapper" :style="{ opacity: ac.opacity }">
    <!-- 装饰元素 - 可以通过 ac.showDecorations 控制 -->
    <div v-if="ac.showDecorations" class="decorations">
      <!-- 主呼吸光圈 -->
      <div class="glow-ring primary"></div>
      
      <!-- 次级光圈 -->
      <div class="glow-ring secondary"></div>
      
      <!-- 外层光环 -->
      <div class="glow-ring outer"></div>
      
      <!-- 四个角的光点 -->
      <div class="corner-lights">
        <div class="corner-light" v-for="i in 4" :key="i" :style="{ '--index': i }"></div>
      </div>
      
      <!-- 中心柔和光晕 -->
      <div class="center-glow"></div>
    </div>

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

/* 装饰元素容器 */
.decorations {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: -1;
}

/* 光圈基础样式 */
.glow-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
}

/* 主呼吸光圈 */
.glow-ring.primary {
  width: 200px;
  height: 200px;
  border: 2px solid rgba(99, 102, 241, 0.4);
  animation: pulse 3s ease-in-out infinite;
}

/* 次级光圈 */
.glow-ring.secondary {
  width: 160px;
  height: 160px;
  border: 1px solid rgba(147, 51, 234, 0.3);
  animation: pulse 2.5s ease-in-out infinite;
  animation-delay: 0.5s;
}

/* 外层光环 */
.glow-ring.outer {
  width: 260px;
  height: 260px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  animation: pulse 4s ease-in-out infinite;
  animation-delay: 1s;
}

/* 四个角的光点 */
.corner-lights {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.corner-light {
  position: absolute;
  width: 6px;
  height: 6px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.8) 0%, transparent 70%);
  border-radius: 50%;
  animation: corner-glow 2s ease-in-out infinite alternate;
  
  /* 根据索引定位到四个角 */
  top: calc(cos(calc(var(--index) * 90deg)) * 120px);
  left: calc(sin(calc(var(--index) * 90deg)) * 120px);
}

/* 中心柔和光晕 */
.center-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  animation: glow-breathe 4s ease-in-out infinite;
}

/* 动画效果 */
@keyframes pulse {
  0%, 100% { 
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.3;
  }
  50% { 
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 0.6;
  }
}

@keyframes corner-glow {
  0% { 
    opacity: 0.3; 
    transform: scale(0.8);
  }
  100% { 
    opacity: 0.8; 
    transform: scale(1.2);
  }
}

@keyframes glow-breathe {
  0%, 100% { 
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.2;
  }
  50% { 
    transform: translate(-50%, -50%) scale(1.3);
    opacity: 0.4;
  }
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