<template>
  <!-- 亮色十字星下落特效容器 -->
  <div v-if="active" class="falling-stars" :style="clipStyle" aria-hidden="true">
    <div v-for="s in stars" :key="s.id" class="star" :style="{
      left: s.left + '%',
      animationDuration: s.duration + 's',
      animationDelay: s.delay + 's',
      '--scale': s.scale,
      '--drift': s.drift + 'px',
      '--hue': s.hue.toString(),
      '--spin': s.spin + 's'
    }">
      <div class="star-inner" />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useAppearanceConfigStore } from '../../../stores/appearanceConfig';

// 说明：本特效采用纯 CSS + 少量随机初始化，不引入额外粒子/动画库（如 tsParticles）以减少体积与运行开销。
// 若未来需要更复杂的交互（碰撞、交汇等）可再考虑 WebGL/Canvas 库。

const ac = useAppearanceConfigStore();
const active = computed(() => ac.decorationType === 'fallingStars');

// 使星星活动区域与 Avatar 圆形一致：Avatar 宽度为整体 petSize 的 80%，半径 = petSize * 0.4
// 使用 clip-path 裁剪，避免重新布局。
const clipStyle = computed(() => {
  const radius = ac.petSize * 0.4; // px
  return {
    clipPath: `circle(${radius}px at 50% 50%)`,
    WebkitClipPath: `circle(${radius}px at 50% 50%)`
  };
});

interface StarMeta {
  id: number;
  left: number;      // 0-100 视口宽度百分比
  delay: number;     // 初始动画延迟，允许为负让界面初始就有不同进度
  duration: number;  // 下落总时长 (s)
  scale: number;     // 缩放大小
  drift: number;     // 水平漂移像素
  hue: number;       // 颜色 HSL 色相
  spin: number;      // 旋转周期 (s)
}

const stars = ref<StarMeta[]>([]);
const STAR_COUNT = 40; // 数量保持，放大尺寸后若觉得拥挤可下调至 18

function generateStars() {
  const pickHue = () => {
    // 金色与淡蓝白混合：70% 金黄区间 45-60，30% 冷色 200-220
    if (Math.random() < 0.7) return 45 + Math.random() * 15;
    return 200 + Math.random() * 20;
  };
  stars.value = Array.from({ length: STAR_COUNT }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: -(Math.random() * 12),
    duration: 12 + Math.random() * 10,
    scale: 0.7 + Math.random() * 1.1,
    drift: (Math.random() * 60) - 30,
    hue: pickHue(),
    spin: 6 + Math.random() * 10 // 6~16s 缓慢旋转
  }));
}

onMounted(() => {
  if (active.value) generateStars();
});

watch(active, v => {
  if (v) generateStars();
  else stars.value = [];
});
</script>
<style scoped>
.falling-stars {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: -1;
  /* 放到最下层，不遮挡前景 */
  /* clip-path 在脚本里按宠物尺寸设置，圆心为容器中心，与 Avatar 居中位置重合 */
}

/* 基础星体：使用交叉形状 + 发光 */
.star {
  position: absolute;
  top: -10vh;
  width: 3px;
  height: 3px;
  opacity: 0;
  animation-name: fs-fall, fs-twinkle;
  animation-timing-function: linear, ease-in-out;
  animation-iteration-count: infinite, infinite;
  animation-fill-mode: both;
  animation-duration: var(--dur, 15s), 3.2s;
  will-change: transform, opacity;
  transform: translateZ(0) scale(var(--scale));
  /* 外层只负责位移与透明度，视觉在内部元素 */
}

.star-inner {
  width: 100%;
  height: 100%;
  position: relative;
  background: radial-gradient(circle, hsl(var(--hue) 100% 92%) 0%, hsl(var(--hue) 100% 70%) 55%, rgba(255, 255, 255, 0) 70%);
  border-radius: 50%;
  filter: drop-shadow(0 0 6px hsla(var(--hue), 100%, 75%, 0.95)) drop-shadow(0 0 14px hsla(var(--hue), 100%, 70%, 0.55));
  animation: fs-spin var(--spin) linear infinite;
}

/* 横竖臂 */
.star-inner::before,
.star-inner::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(90deg, hsla(var(--hue), 100%, 85%, 0), hsl(var(--hue) 100% 88%), hsla(var(--hue), 100%, 85%, 0));
  pointer-events: none;
}

.star-inner::before {
  /* 水平臂 */
  width: 14px;
  height: 1.2px;
}

.star-inner::after {
  /* 垂直臂 */
  width: 1.2px;
  height: 14px;
  background: linear-gradient(180deg, hsla(var(--hue), 100%, 85%, 0), hsl(var(--hue) 100% 88%), hsla(var(--hue), 100%, 85%, 0));
}

@keyframes fs-fall {
  0% {
    transform: translate3d(0, 0, 0) scale(var(--scale));
    opacity: 0;
  }

  5% {
    opacity: 1;
  }

  95% {
    opacity: 1;
  }

  100% {
    transform: translate3d(var(--drift), 120vh, 0) scale(var(--scale));
    opacity: 0;
  }
}

@keyframes fs-twinkle {

  0%,
  100% {
    filter: brightness(1) saturate(1);
  }

  50% {
    filter: brightness(1.25) saturate(1.15);
  }
}

@keyframes fs-spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

/* 强制开启动画：忽略系统的减少动态设置 */
</style>