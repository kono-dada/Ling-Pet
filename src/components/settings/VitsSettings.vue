<template>
  <v-container>
    <v-card flat class="pa-2">
      <v-card-text>

        <div class="mb-8">
          <h2 class="text-h6 font-weight-bold mb-4">VITS 语音服务</h2>
          <v-divider class="mb-6"></v-divider>

          <v-alert type="info" variant="tonal" density="compact" class="mb-4">
            <div class="d-flex align-center">
              <span class="mr-1">注意，需要先配置好 vits-simple-api，具体参见<a href="#" @click.prevent="openGitHubLink"
                  class="text-primary text-decoration-underline" style="cursor: pointer;">
                  vits-simple-api
                </a></span>
            </div>
          </v-alert>

          <v-switch v-model="vc.on" label="启用VITS语音合成服务" color="primary" class="mb-4" hint="开启后，宠物的回复将会合成为语音"
            persistent-hint></v-switch>

          <v-text-field v-model="vc.baseURL" label="VITS API 基础地址" variant="outlined" density="compact" persistent-hint
            class="mb-4" :disabled="!vc.on" placeholder="http://localhost:23456"></v-text-field>

          <v-text-field v-model.number="vc.id" label="音色ID" variant="outlined" density="compact" persistent-hint
            type="number" :disabled="!vc.on" hint="不同的音色ID对应不同的声音"></v-text-field>
        </div>

        <v-divider class="my-8"></v-divider>

        <div class="mb-8" :class="{ 'text-disabled': !vc.on }">
          <h2 class="text-h6 font-weight-bold mb-4">语音参数</h2>
          <v-divider class="mb-6"></v-divider>

          <div class="mb-6">
            <div class="d-flex justify-space-between align-center mb-1">
              <v-label>语音长度</v-label>
              <span class="text-primary font-weight-medium">{{ vc.length }}</span>
            </div>
            <p class="text-caption text-medium-emphasis">控制语音的播放速度</p>
            <v-slider v-model="vc.length" :min="0.5" :max="2" :step="0.1" thumb-label color="primary"
              :disabled="!vc.on"></v-slider>
          </div>

          <div class="mb-6">
            <div class="d-flex justify-space-between align-center mb-1">
              <v-label>噪声强度</v-label>
              <span class="text-primary font-weight-medium">{{ vc.noise }}</span>
            </div>
            <p class="text-caption text-medium-emphasis">控制语音的随机性</p>
            <v-slider v-model="vc.noise" :min="0" :max="1" :step="0.01" thumb-label color="orange"
              :disabled="!vc.on"></v-slider>
          </div>

          <div class="mb-6">
            <div class="d-flex justify-space-between align-center mb-1">
              <v-label>噪声权重</v-label>
              <span class="text-primary font-weight-medium">{{ vc.noisew }}</span>
            </div>
            <p class="text-caption text-medium-emphasis">控制噪声对语音的影响程度</p>
            <v-slider v-model="vc.noisew" :min="0" :max="1" :step="0.01" thumb-label color="green"
              :disabled="!vc.on"></v-slider>
          </div>

          <div class="mb-6">
            <div class="d-flex justify-space-between align-center mb-1">
              <v-label>分段大小</v-label>
              <span class="text-primary font-weight-medium">{{ vc.segmentSize }}</span>
            </div>
            <p class="text-caption text-medium-emphasis">长文本分段处理的大小</p>
            <v-slider v-model="vc.segmentSize" :min="10" :max="200" :step="10" thumb-label color="purple"
              :disabled="!vc.on"></v-slider>
          </div>
        </div>

        <v-divider class="my-8"></v-divider>

        <div>
          <v-btn :disabled="isTesting || !vc.on || !vc.baseURL" @click="testConnection" color="primary" size="large"
            block>
            {{ isTesting ? '测试中...' : '测试连接' }}
          </v-btn>

          <v-alert v-if="testResult" :type="testResult.success ? 'success' : 'error'" :text="testResult.message"
            variant="tonal" density="compact" class="mt-4" closable @click:close="testResult = null"></v-alert>
        </div>

      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useVitsConfigStore } from '../../stores/vitsConfig';
import { voiceVits } from '../../services/vitsService';
import { openUrl } from '@tauri-apps/plugin-opener';

// 测试相关
const testResult = ref<{ success: boolean; message: string } | null>(null);
const isTesting = ref(false);

const vc = useVitsConfigStore();

// 打开GitHub链接
async function openGitHubLink() {
  try {
    await openUrl('https://github.com/Artrajz/vits-simple-api');
  } catch (error) {
    console.error('Failed to open link:', error);
  }
}

// 测试连接
async function testConnection() {
  isTesting.value = true;
  testResult.value = null;

  try {
    // 使用简短的测试文本
    const testText = "测试";
    await voiceVits(testText);

    testResult.value = {
      success: true,
      message: 'VITS服务连接成功！'
    };
  } catch (error) {
    testResult.value = {
      success: false,
      message: `连接失败：${error instanceof Error ? error.message : '未知错误'}`
    };
  } finally {
    isTesting.value = false;
  }
}
</script>

<style scoped>
.v-label {
  font-size: 1rem;
  font-weight: 500;
  opacity: 1;
}

.text-disabled {
  opacity: 0.6;
}
</style>
