<template>
  <v-container>
    <v-card flat class="pa-2">
      <v-card-text>

        <div class="mb-8">
          <h2 class="text-h6 font-weight-bold mb-4">API 配置</h2>
          <v-divider class="mb-6"></v-divider>

          <v-text-field v-model="sc.apiKey" :type="showApiKey ? 'text' : 'password'" label="API Key"
            variant="outlined" density="compact" persistent-hint
            :append-inner-icon="showApiKey ? 'mdi-eye-off' : 'mdi-eye'" @click:append-inner="showApiKey = !showApiKey"
            class="mb-4"></v-text-field>

          <v-text-field v-model="sc.baseURL" label="API 基础地址" variant="outlined" density="compact"
            persistent-hint class="mb-4"></v-text-field>

          <v-text-field v-model="sc.model" label="模型" variant="outlined" density="compact"
            persistent-hint></v-text-field>
        </div>

        <v-divider class="my-8"></v-divider>

        <div class="mb-8">
          <h2 class="text-h6 font-weight-bold mb-4">对话参数</h2>
          <v-divider class="mb-6"></v-divider>

          <div class="mb-6">
            <div class="d-flex justify-space-between align-center mb-1">
              <v-label>Temperature</v-label>
              <span class="text-primary font-weight-medium">{{ sc.temperature }}</span>
            </div>
            <p class="text-caption text-medium-emphasis">控制回复的随机性和创造性</p>
            <v-slider v-model="sc.temperature" :min="0" :max="1" :step="0.1" thumb-label color="primary"></v-slider>
          </div>

          <div class="mb-6">
            <div class="d-flex justify-space-between align-center mb-1">
              <v-label>最大回复长度</v-label>
              <span class="text-primary font-weight-medium">{{ sc.maxTokens }}</span>
            </div>
            <v-slider v-model="sc.maxTokens" :min="1000" :max="20000" :step="200" thumb-label color="orange"></v-slider>
          </div>

          <div>
            <div class="d-flex justify-space-between align-center mb-1">
              <v-label>图像细节级别</v-label>
              <span class="text-primary font-weight-medium">{{ sc.imageDetail }}</span>
            </div>
            <p class="text-caption text-medium-emphasis">控制图像分析的详细程度</p>
            <v-select 
              v-model="sc.imageDetail" 
              :items="imageDetailOptions" 
              variant="outlined" 
              density="compact"
              class="mt-2"></v-select>
          </div>
        </div>

        <v-divider class="my-8"></v-divider>

        <div class="mb-8">
          <div class="d-flex justify-space-between align-center mb-4">
            <h2 class="text-h6 font-weight-bold">系统设置</h2>
            <v-btn variant="text" size="small" @click="sc.systemPrompt = DEFAULT_SCREEN_PROMPT;">
              重置为默认
            </v-btn>
          </div>
          <v-divider class="mb-6"></v-divider>

          <v-textarea v-model="sc.systemPrompt" label="系统提示词" variant="outlined" rows="6" auto-grow
            hint="定义屏幕分析的提示和规则" persistent-hint></v-textarea>
        </div>

        <v-divider class="my-8"></v-divider>

        <div>
          <v-btn :disabled="isTesting" @click="testConnection" color="primary" size="large" block>
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
import { useScreenAnalysisConfigStore } from '../../stores/screenAnalysisConfig';
import { useScreenAnalysisService } from '../../services/screenAnalysisService';

// 默认系统提示词
const DEFAULT_SCREEN_PROMPT = '描述此屏幕截图的内容';

// 测试相关
const testResult = ref<{ success: boolean; message: string } | null>(null);
const isTesting = ref(false);

const sc = useScreenAnalysisConfigStore();
const { testScreenAnalysis } = useScreenAnalysisService();

const showApiKey = ref(false);

// 图像细节选项
const imageDetailOptions = [
  { title: '低 (Low)', value: 'low' },
  { title: '中 (Medium)', value: 'medium' },
  { title: '高 (High)', value: 'high' }
];

// 测试连接
async function testConnection() {
  isTesting.value = true;
  const result = await testScreenAnalysis();
  isTesting.value = false;
  testResult.value = result;
}
</script>

<style scoped>
.v-label {
  font-size: 1rem;
  font-weight: 500;
  opacity: 1;
}
</style>
