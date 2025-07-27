<template>
  <button class="settings-button" @click.stop.prevent="openSettings" @mousedown.stop.prevent @mouseup.stop.prevent
    title="打开设置">
    <v-icon size="18">mdi-cog</v-icon>
  </button>
</template>

<script lang="ts" setup>
import { getAllWebviewWindows, WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { debug } from '@tauri-apps/plugin-log';

async function openSettings() {
  const allWindows = await getAllWebviewWindows();
  const allLabels = allWindows.map(window => window.label);
  debug(allLabels.join(', '));
  const settingsWindow = allWindows.find(window => window.label === 'settings');
  if (settingsWindow) {
    settingsWindow?.close();
    return;
  }
  const settingWindowConfig = {
    title: '设置',
    url: '/#/settings',
    label: 'settings',
    width: 800,
    height: 600,
    resizable: true,
    transparent: false,
    decorations: true,
    alwaysOnTop: false,
    skipTaskbar: true,
    center: false,
    visible: false,
  };
  new WebviewWindow('settings', {
    ...settingWindowConfig,
    visible: true
  });
}
</script>

<style scoped>
.settings-button {
  position: absolute;
  top: 10%;
  right: 10%;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(5px);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

.settings-button:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(255, 255, 255, 1);
  transform: scale(1.1);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.3);
  opacity: 1;
}
</style>