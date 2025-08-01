<template>
  <v-container>
    <v-card flat class="pa-2">
      <v-card-text>

        <div class="mb-8">
          <h2 class="text-h6 font-weight-bold mb-4">关于应用</h2>
          <v-divider class="mb-6"></v-divider>

          <div class="mb-4">
            <h3 class="text-subtitle-1 font-weight-medium mb-2">LingPet</h3>
            <p class="text-body-2 text-medium-emphasis">
              一个可爱的桌面宠物应用，基于 Tauri 和 Vue 开发。
            </p>
          </div>

          <div class="mb-4">
            <h4 class="text-subtitle-2 font-weight-medium mb-2">版本信息</h4>
            <p class="text-body-2 text-medium-emphasis">
              Version 1.0.0
            </p>
          </div>
        </div>

        <v-divider class="my-8"></v-divider>

        <div>
          <h2 class="text-h6 font-weight-bold mb-4">应用操作</h2>
          <v-divider class="mb-6"></v-divider>
          
          <div class="d-flex flex-column ga-3">
            <v-btn @click="openDataFolder" color="blue-darken-1" variant="flat" block size="large" prepend-icon="mdi-folder-open">
              打开数据文件夹
            </v-btn>

            <v-btn @click="openLingChat" color="yellow-darken-2" variant="flat" block size="large" prepend-icon="mdi-chat">
              打开LingChat
            </v-btn>
            
            <v-btn @click="quitApp" color="red-darken-1" variant="flat" block size="large" prepend-icon="mdi-logout">
              退出应用
            </v-btn>
          </div>
        </div>

      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core';
import { getAllWebviewWindows, WebviewWindow } from '@tauri-apps/api/webviewWindow';

// Quit the application
async function quitApp() {
  await invoke('quit_app');
}

// Open the application data folder
async function openDataFolder() {
  await invoke('open_data_folder');
}

async function openLingChat() {
  const allWindows = await getAllWebviewWindows();
  const lingChatWindow = allWindows.find(window => window.label === 'lingchat');
  if (lingChatWindow) {
    lingChatWindow?.close();
    return;
  }
  const lingChatWindowConfig = {
    title: 'LingChat',
    url: '/#/lingchat',
    label: 'lingchat',
    width: 1080,
    height: 720,
    resizable: true,
    transparent: false,
    decorations: true,
    alwaysOnTop: false,
    skipTaskbar: true,
    center: false,
    visible: false,
  };
  new WebviewWindow('lingchat', {
    ...lingChatWindowConfig,
    visible: true
  });
}
</script>

<style scoped>
/* All major styles are handled by Vuetify, this can be left empty or for minor tweaks. */
.v-label {
  font-size: 1rem;
  font-weight: 500;
  opacity: 1;
}
</style>