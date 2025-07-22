<template>
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
</template>

<script lang="ts" setup>
import { useAppearanceConfigStore } from '../../stores/appearanceConfig';

const ac = useAppearanceConfigStore();
</script>

<style scoped>
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
  width: 60vmin;
  height: 60vmin;
  border: 3px solid rgba(99, 102, 241, 0.6);
  /* 提高透明度 */
  animation: pulse 3s ease-in-out infinite;
}

/* 次级光圈 */
.glow-ring.secondary {
  width: 48vmin;
  height: 48vmin;
  border: 2px solid rgba(147, 51, 234, 0.5);
  /* 提高透明度 */
  animation: pulse 2.5s ease-in-out infinite;
  animation-delay: 0.5s;
}

/* 外层光环 */
.glow-ring.outer {
  width: 78vmin;
  height: 78vmin;
  border: 2px solid rgba(59, 130, 246, 0.4);
  /* 提高透明度 */
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
  width: 1.8vmin;
  height: 1.8vmin;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.8) 0%, transparent 70%);
  border-radius: 50%;
  animation: corner-glow 2s ease-in-out infinite alternate;

  /* 根据索引定位到四个角 */
  top: calc(cos(calc(var(--index) * 90deg)) * 36vmin);
  left: calc(sin(calc(var(--index) * 90deg)) * 36vmin);
}

/* 中心柔和光晕 */
.center-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 30vmin;
  height: 30vmin;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  animation: glow-breathe 4s ease-in-out infinite;
}

/* 动画效果 */
@keyframes pulse {

  0%,
  100% {
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

  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.2;
  }

  50% {
    transform: translate(-50%, -50%) scale(1.3);
    opacity: 0.4;
  }
}
</style>