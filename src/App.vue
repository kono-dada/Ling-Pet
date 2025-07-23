<script setup lang="ts">
import { useAppearanceConfigStore } from './stores/appearanceConfig';
import { useStateStore } from './stores/petState';
import { useChatBubbleStateStore } from './stores/chatBubbleState';
import { useAIConfigStore } from './stores/aiConfig';
import { onMounted } from 'vue';
import { denySave } from '@tauri-store/pinia';

onMounted(async () => {
  await useAppearanceConfigStore().$tauri.start();
  await useStateStore().$tauri.start();
  await useChatBubbleStateStore().$tauri.start();
  await useAIConfigStore().$tauri.start();
  denySave('chatBubbleState');
});
</script>

<template>
  <router-view />
</template>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  height: 100%;
  overflow: hidden;
}
</style>