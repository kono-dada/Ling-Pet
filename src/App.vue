<script setup lang="ts">
// 应用入口组件
</script>

<template>
  <v-app>
    <router-view/>
  </v-app>
</template>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
}

#app {
  height: 100%;
}

</style>