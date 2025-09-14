<template>
  <component :is="currentComp" v-if="currentComp" />
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import { useAppearanceConfigStore } from '../../../stores/configs/appearanceConfig';
import CircleDecoration from './CircleDecoration.vue';
import FallingStarsDecoration from './FallingStarsDecoration.vue';

const ac = useAppearanceConfigStore();

// 可在此添加新的装饰组件映射
const registry: Record<string, any> = {
  circle: CircleDecoration,
  fallingStars: FallingStarsDecoration,
};

const currentComp = computed(() => {
  // 在Live2D模式下默认不显示装饰
  if (ac.avatarType === 'live2d') return null;
  if (ac.decorationType === 'none') return null;
  return registry[ac.decorationType] || null;
});
</script>