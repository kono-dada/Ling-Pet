<template>
  <div v-if="active" class="decorations" :style="rootStyle">
    <div class="center-origin">
      <div class="glow-ring primary" />
      <div class="glow-ring secondary" />
      <div class="glow-ring outer" />
      <div class="corner-lights">
        <div class="corner-light" v-for="i in 4" :key="i" :style="{ '--rot': (i-1)*90 + 'deg' }" />
      </div>
      <div class="center-glow" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useAppearanceConfigStore } from '../../../stores/appearanceConfig';

const ac = useAppearanceConfigStore();
const active = computed(() => ac.decorationType === 'circle');

// 用 petSize 驱动所有尺寸，避免依赖 viewport 单位在 Tauri resize 时的不同步问题
const rootStyle = computed(() => ({
  '--base': ac.petSize + 'px',
}));
</script>

<style scoped>
.decorations { position:absolute; inset:0; pointer-events:none; z-index:-1; display:grid; place-items:center; }
/* 中心原点：零尺寸，用于定位所有同心元素 */
.center-origin { position:relative; width:0; height:0; }

/* 同心光圈：通过 --size 变量 + 绝对偏移实现真正同心，不依赖 translate */
.glow-ring { position:absolute; top:calc(var(--size) / -2); left:calc(var(--size) / -2); width:var(--size); height:var(--size); border-radius:50%; transform-origin:center center; }
.glow-ring.primary { --size: calc(var(--base) * 0.60); border:3px solid rgba(99,102,241,.6); animation:pulse 3s ease-in-out infinite; }
.glow-ring.secondary { --size: calc(var(--base) * 0.48); border:2px solid rgba(147,51,234,.5); animation:pulse 2.5s ease-in-out infinite; animation-delay:.5s; }
.glow-ring.outer { --size: calc(var(--base) * 0.78); border:2px solid rgba(59,130,246,.4); animation:pulse 4s ease-in-out infinite; animation-delay:1s; }

/* 角点容器：基于中心点旋转平移 */
.corner-lights { position:absolute; top:0; left:0; width:0; height:0; }
.corner-light { position:absolute; top:0; left:0; width:calc(var(--base) * 0.018); height:calc(var(--base) * 0.018); background:radial-gradient(circle, rgba(99,102,241,.8) 0%, transparent 70%); border-radius:50%; animation:corner-glow 2s ease-in-out infinite alternate; transform:rotate(var(--rot)) translateY(calc(var(--base) * -0.36)); transform-origin:center center; }

.center-glow { position:absolute; top:calc(var(--size) / -2); left:calc(var(--size) / -2); --size: calc(var(--base) * 0.30); width:var(--size); height:var(--size); background:radial-gradient(circle, rgba(99,102,241,.1) 0%, transparent 70%); border-radius:50%; animation:glow-breathe 4s ease-in-out infinite; }

@keyframes pulse { 0%,100% { transform:scale(1); opacity:.3; } 50% { transform:scale(1.1); opacity:.6; } }
@keyframes corner-glow { 0% { opacity:.3; transform:rotate(var(--rot)) translateY(calc(var(--base) * -0.36)) scale(.8); } 100% { opacity:.8; transform:rotate(var(--rot)) translateY(calc(var(--base) * -0.36)) scale(1.2); } }
@keyframes glow-breathe { 0%,100% { transform:scale(1); opacity:.2; } 50% { transform:scale(1.3); opacity:.4; } }
</style>
