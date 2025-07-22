<script setup lang="ts">
import { useAppearanceConfigStore } from './stores/appearanceConfig';
import { useStateStore } from './stores/petState';
import { onMounted } from 'vue';

onMounted(() => {
  useAppearanceConfigStore().$tauri.start();
  useStateStore().$tauri.start();
});
</script>

<template>
  <router-view/>
</template>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app{
  height: 100%;
  overflow: hidden;
}

</style>