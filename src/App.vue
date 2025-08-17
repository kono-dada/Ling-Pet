<script setup lang="ts">
import { useAppearanceConfigStore } from './stores/appearanceConfig';
import { usePetStateStore } from './stores/petState';
import { useAIConfigStore } from './stores/aiConfig';
import { useChatHistoryStore } from './stores/chatHistory';
import { useScreenAnalysisConfigStore } from './stores/screenAnalysisConfig';
import { useVitsConfigStore } from './stores/vitsConfig';
import { useConversationStore } from './stores/conversation';
import { useScheduleStore } from './stores/schedule';
import { onMounted } from 'vue';
import { denySave } from '@tauri-store/pinia';

onMounted(async () => {
  await useAppearanceConfigStore().$tauri.start();
  await usePetStateStore().$tauri.start();
  await useAIConfigStore().$tauri.start();
  await useChatHistoryStore().$tauri.start();
  await useScreenAnalysisConfigStore().$tauri.start();
  await useConversationStore().$tauri.start();
  const vitsConfig = useVitsConfigStore();
  await vitsConfig.$tauri.start();
  // 会话编排使用非持久化的会话 store（conversation），无需 denySave
  denySave('conversation');
  // Initialize schedule manager: restore state and start heartbeat
  try {
    const schedule = useScheduleStore()
    console.log('[schedule] init: start storage + rehydrate + startHeartbeat')
    schedule.$tauri.start()
    schedule.rehydrate()
    schedule.startHeartbeat()
  } catch (e) {
    console.error('Failed to initialize schedule manager:', e)
  }
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
  display: none;
  /* Windows禁止显示滚动条 */
}
</style>
