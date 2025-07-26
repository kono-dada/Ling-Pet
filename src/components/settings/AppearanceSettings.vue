<template>
  <v-container>
    <v-card flat class="pa-2">
      <v-card-text>

        <div class="mb-8">
          <h2 class="text-h6 font-weight-bold mb-4">外观配置</h2>
          <v-divider class="mb-6"></v-divider>

          <div class="mb-6">
            <div class="d-flex justify-space-between align-center mb-1">
              <v-label>宠物大小</v-label>
              <span class="text-primary font-weight-medium">{{ ac.petSize }}px</span>
            </div>
            <v-slider v-model="ac.petSize" :min="MIN_SIZE" :max="MAX_SIZE" :step="1" thumb-label hide-details
              color="primary"></v-slider>
          </div>

          <div class="mb-6">
            <div class="d-flex justify-space-between align-center mb-1">
              <v-label>透明度</v-label>
              <span class="text-primary font-weight-medium">{{ formattedOpacity }}</span>
            </div>
            <v-slider v-model="ac.opacity" :min="MIN_OPACITY" :max="MAX_OPACITY" :step="0.01" thumb-label hide-details
              color="orange"></v-slider>
          </div>

          <div class="d-flex justify-space-between align-center">
            <div>
              <v-label>显示光圈装饰</v-label>
            </div>
            <v-switch
              v-model="ac.showDecorations"
              color="success"
              inset
              hide-details
            ></v-switch>
          </div>
        </div>

        <v-divider class="my-8"></v-divider>

        <div>
          <h2 class="text-h6 font-weight-bold mb-4">其他操作</h2>
          <v-divider class="mb-6"></v-divider>
          <v-btn @click="quitApp" color="red-darken-1" variant="flat" block size="large" prepend-icon="mdi-logout">
            退出应用
          </v-btn>
        </div>

      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { useAppearanceConfigStore } from '../../stores/appearanceConfig';

// Constants
const MIN_SIZE = 100;
const MAX_SIZE = 300;
const MIN_OPACITY = 0.1;
const MAX_OPACITY = 1.0;

// State management
const ac = useAppearanceConfigStore();

// Computed property to format the opacity value for display
const formattedOpacity = computed(() => `${Math.round(ac.opacity * 100)}%`);

// Quit the application
async function quitApp() {
  await invoke('quit_app');
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