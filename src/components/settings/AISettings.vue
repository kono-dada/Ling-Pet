<template>
  <v-container>
    <v-card flat class="pa-2">
      <v-card-text>

        <div class="mb-8">
          <h2 class="text-h6 font-weight-bold mb-4">API 配置</h2>
          <v-divider class="mb-6"></v-divider>

          <v-text-field v-model="ac.apiKey" :type="showApiKey ? 'text' : 'password'" label="API Key"
            variant="outlined" density="compact" persistent-hint
            :append-inner-icon="showApiKey ? 'mdi-eye-off' : 'mdi-eye'" @click:append-inner="showApiKey = !showApiKey"
            class="mb-4"></v-text-field>

          <v-text-field v-model="ac.baseURL" label="API 基础地址" variant="outlined" density="compact"
            class="mb-4" hint="如：https://api.deepseek.com/v1"></v-text-field>

          <v-text-field v-model="ac.model" label="模型" variant="outlined" density="compact"
            hint="如：deepseek-chat"></v-text-field>
        </div>

        <v-divider class="my-8"></v-divider>

        <div class="mb-8">
          <h2 class="text-h6 font-weight-bold mb-4">对话参数</h2>
          <v-divider class="mb-6"></v-divider>

          <div class="mb-6">
            <div class="d-flex justify-space-between align-center mb-1">
              <v-label>Temperature</v-label>
              <span class="text-primary font-weight-medium">{{ ac.temperature }}</span>
            </div>
            <p class="text-caption text-medium-emphasis">控制回复的随机性和创造性</p>
            <v-slider v-model="ac.temperature" :min="0" :max="1" :step="0.1" thumb-label color="primary"></v-slider>
          </div>

          <div>
            <div class="d-flex justify-space-between align-center mb-1">
              <v-label>最大回复长度</v-label>
              <span class="text-primary font-weight-medium">{{ ac.maxTokens }}</span>
            </div>
            <v-slider v-model="ac.maxTokens" :min="1000" :max="20000" :step="200" thumb-label color="orange"></v-slider>
          </div>

          <!-- 历史消息最大长度，使用ac.historyMaxLength控制，用slider，范围为10~inf -->
          <div class="mt-6">
            <div class="d-flex justify-space-between align-center mb-1">
              <v-label>历史消息最大长度</v-label>
              <span class="text-primary font-weight-medium">{{ ac.historyMaxLength }}</span>
            </div>
            <v-slider v-model="ac.historyMaxLength" :min="10" :max="1000" :step="10" thumb-label color="green"></v-slider>
          </div>

        </div>

        <v-divider class="my-8"></v-divider>

        <div class="mb-8">
          <div class="d-flex justify-space-between align-center mb-4">
            <h2 class="text-h6 font-weight-bold">系统设置</h2>
            <v-btn variant="text" size="small" @click="ac.systemPrompt = DEFAULT_CHARACTER_PROMPT;">
              重置为默认
            </v-btn>
          </div>
          <v-divider class="mb-6"></v-divider>

          <v-textarea v-model="ac.systemPrompt" label="系统提示词" variant="outlined" rows="6" auto-grow
            hint="定义宠物的性格和行为规则" persistent-hint></v-textarea>
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
import { ref  } from 'vue';
import { DEFAULT_CHARACTER_PROMPT } from '../../constants/ai';
import { useAIConfigStore } from '../../stores/aiConfig';
import { testAIConnection } from '../../services/chatAndVoice/aiService';

// 测试相关
const testResult = ref<{ success: boolean; message: string } | null>(null);
const isTesting = ref(false);

const ac = useAIConfigStore();

const showApiKey = ref(false);


// 测试连接
async function testConnection() {
  isTesting.value = true;
  const result = await testAIConnection();
  isTesting.value = false;
  testResult.value = result;
}

</script>

<style scoped>
/* Scoped styles are no longer needed as Vuetify handles the component styling. */
/* You can add specific overrides here if necessary. */
.v-label {
  font-size: 1rem;
  font-weight: 500;
  opacity: 1;
}
</style>