<template>
  <div class="main-page">
    <v-btn @click="closeApp">
      Close!
    </v-btn>
  </div>
</template>

<script> 
import { invoke } from '@tauri-apps/api/core';

export default {
  methods: {
    closeApp() {
      invoke('quit_app');
    }
  }
};
</script>

<style scoped>
/* totally transparent, center, no-scrolling */
.main-page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  overscroll-behavior: none;
}
</style>