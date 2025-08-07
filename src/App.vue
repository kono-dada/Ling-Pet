<script setup lang="ts">
import { useAppearanceConfigStore } from './stores/appearanceConfig';
import { usePetStateStore } from './stores/petState';
import { useChatBubbleStateStore } from './stores/chatBubbleState';
import { useAIConfigStore } from './stores/aiConfig';
import { useChatHistoryStore } from './stores/chatHistory';
import { useScreenAnalysisConfigStore } from './stores/screenAnalysisConfig';
import { useVitsConfigStore } from './stores/vitsConfig';
import { onMounted } from 'vue';
import { denySave } from '@tauri-store/pinia';

onMounted(async () => {
  await useAppearanceConfigStore().$tauri.start();
  await usePetStateStore().$tauri.start();
  await useChatBubbleStateStore().$tauri.start();
  await useAIConfigStore().$tauri.start();
  await useChatHistoryStore().$tauri.start();
  await useScreenAnalysisConfigStore().$tauri.start();
  await useVitsConfigStore().$tauri.start();
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
}

body::-webkit-scrollbar {
  display: none; /* Windows禁止显示滚动条 */
}
</style>