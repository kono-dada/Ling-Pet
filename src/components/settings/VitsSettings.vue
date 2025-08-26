<template>
  <v-container>
    <v-card flat class="pa-2">
      <v-card-title class="py-3 d-flex align-center justify-space-between">
        <div>
          <div class="text-h6 font-weight-bold">VITS 语音服务</div>
          <div class="text-caption text-medium-emphasis mt-1">
            支持 Style-Bert-VITS2 和 Bert-VITS2 的本地/远程 TTS
          </div>
        </div>
        <v-switch
          v-model="vc.on"
          color="primary"
          hide-details
          inset
          :label="vc.on ? '已启用' : '未启用'"
        />
      </v-card-title>
      <v-divider></v-divider>

      <v-card-text>
        <v-alert type="info" variant="tonal" density="compact" class="mb-6">
          <div class="d-flex align-center">
            <span class="mr-1">请先正确配置或安装对应的API服务（在页面底部）</span>
          </div>
        </v-alert>

        <!-- 引擎类型选择 -->
        <div :class="{ 'text-disabled': disabled }">
          <h3 class="text-subtitle-1 font-weight-medium mb-3">引擎类型</h3>
          <v-btn-toggle
            v-model="vc.engineType"
            color="primary"
            mandatory
            variant="outlined"
            divided
            :disabled="disabled"
            class="mb-4"
          >
            <v-btn value="style-bert-vits2">
              <v-icon start>mdi-microphone</v-icon>
              Style-Bert-VITS2
            </v-btn>
            <v-btn value="bert-vits2">
              <v-icon start>mdi-microphone-variant</v-icon>
              Bert-VITS2
            </v-btn>
          </v-btn-toggle>
          <p class="text-caption text-medium-emphasis mb-4">
            Style-Bert-VITS2: 适用于本地部署，支持情感控制<br>
            Bert-VITS2: 适用于远程API调用，配置简单
          </p>
        </div>

        <v-divider class="my-6"></v-divider>

        <!-- 连接与服务 -->
        <div :class="{ 'text-disabled': disabled }">
          <h3 class="text-subtitle-1 font-weight-medium mb-3">连接与服务</h3>
          <v-row>
            <v-col cols="12" md="7">
              <v-text-field
                v-model="vc.baseURL"
                :label="engineConfig.serverLabel"
                variant="outlined"
                density="compact"
                class="mb-4"
                :disabled="disabled"
                :placeholder="engineConfig.placeholder"
                :hint="engineConfig.hint"
                persistent-hint
              />
            </v-col>
            <v-col cols="12" md="5">
              <!-- Style-Bert-VITS2 音色ID -->
              <v-text-field
                v-if="engineConfig.isStyleBertVits2"
                v-model="vc.ident"
                :label="engineConfig.speakerLabel"
                variant="outlined"
                density="compact"
                :disabled="disabled"
                :hint="engineConfig.speakerHint"
                persistent-hint
              />
              <!-- Bert-VITS2 说话人ID -->
              <v-text-field
                v-else
                v-model.number="vc.bv2SpeakerId"
                :label="engineConfig.speakerLabel"
                variant="outlined"
                density="compact"
                type="number"
                :disabled="disabled"
                :hint="engineConfig.speakerHint"
                persistent-hint
              />
            </v-col>
          </v-row>

          <v-row class="align-center">
            <v-col cols="12" md="6">
              <v-switch
                v-if="engineConfig.isStyleBertVits2"
                v-model="vc.autoStartSbv2"
                color="secondary"
                :disabled="disabled"
                hide-details
                label="应用启动时自动启动本地 sbv2_api"
              />
              <div v-else class="text-caption text-medium-emphasis">
                Bert-VITS2 通过vits-simple-api同时支持远程部署与本地运行
              </div>
            </v-col>
            <v-col cols="12" md="6">
              <v-btn
                v-if="engineConfig.isStyleBertVits2"
                color="secondary"
                variant="tonal"
                @click="startSbv2Api"
                :disabled="starting || disabled"
                block
                class="mb-2"
              >
                {{ starting ? '启动中…' : '启动本地语音服务（启动成功后可能还要等待一会）' }}
              </v-btn>
              <v-btn
                color="primary"
                @click="testConnection"
                :disabled="isTesting || disabled || !vc.baseURL"
                block
              >
                {{ isTesting ? '测试中…' : '测试连接' }}
              </v-btn>
            </v-col>
          </v-row>

          <v-alert
            v-if="testResult"
            :type="testResult.success ? 'success' : 'error'"
            :text="testResult.message"
            variant="tonal"
            density="compact"
            class="mt-3"
            closable
            @click:close="testResult = null"
          />
        </div>

        <v-divider class="my-6"></v-divider>

        <!-- 语音参数 -->
        <div :class="{ 'text-disabled': disabled }">
          <h3 class="text-subtitle-1 font-weight-medium mb-3">语音参数</h3>
          
          <!-- Style-Bert-VITS2 参数 -->
          <template v-if="engineConfig.isStyleBertVits2">
            <v-row>
              <v-col cols="12" md="6">
                <div class="d-flex justify-space-between align-center mb-1">
                  <v-label>SDP Ratio</v-label>
                  <span class="text-primary font-weight-medium">{{ vc.sdpRatio }}</span>
                </div>
                <p class="text-caption text-medium-emphasis">数值越大，情感越丰富</p>
                <v-slider
                  v-model="vc.sdpRatio"
                  :min="0"
                  :max="1"
                  :step="0.1"
                  thumb-label
                  color="orange"
                  :disabled="disabled"
                />
              </v-col>
              <v-col cols="12" md="6">
                <div class="d-flex justify-space-between align-center mb-1">
                  <v-label>Length Scale</v-label>
                  <span class="text-primary font-weight-medium">{{ vc.lengthScale }}</span>
                </div>
                <p class="text-caption text-medium-emphasis">控制语音时长与语速</p>
                <v-slider
                  v-model="vc.lengthScale"
                  :min="0.1"
                  :max="2.0"
                  :step="0.1"
                  thumb-label
                  color="primary"
                  :disabled="disabled"
                />
              </v-col>
            </v-row>
          </template>
          
          <!-- Bert-VITS2 参数 -->
          <template v-else>
            <v-row>
              <v-col cols="12" md="6">
                <div class="d-flex justify-space-between align-center mb-1">
                  <v-label>语速 (Length)</v-label>
                  <span class="text-primary font-weight-medium">{{ vc.bv2Length }}</span>
                </div>
                <p class="text-caption text-medium-emphasis">数值越大，语速越慢</p>
                <v-slider
                  v-model="vc.bv2Length"
                  :min="0.1"
                  :max="3.0"
                  :step="0.1"
                  thumb-label
                  color="primary"
                  :disabled="disabled"
                />
              </v-col>
              <v-col cols="12" md="6">
                <div class="d-flex justify-space-between align-center mb-1">
                  <v-label>采样噪声 (Noise)</v-label>
                  <span class="text-primary font-weight-medium">{{ vc.bv2Noise }}</span>
                </div>
                <p class="text-caption text-medium-emphasis">控制语音的随机性</p>
                <v-slider
                  v-model="vc.bv2Noise"
                  :min="0"
                  :max="2"
                  :step="0.01"
                  thumb-label
                  color="orange"
                  :disabled="disabled"
                />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" md="6">
                <div class="d-flex justify-space-between align-center mb-1">
                  <v-label>SDP噪声 (NoiseW)</v-label>
                  <span class="text-primary font-weight-medium">{{ vc.bv2Noisew }}</span>
                </div>
                <p class="text-caption text-medium-emphasis">影响语音的韵律和音调变化</p>
                <v-slider
                  v-model="vc.bv2Noisew"
                  :min="0"
                  :max="2"
                  :step="0.01"
                  thumb-label
                  color="teal"
                  :disabled="disabled"
                />
              </v-col>
              <v-col cols="12" md="6">
                <div class="d-flex justify-space-between align-center mb-1">
                  <v-label>SDP/DP混合比</v-label>
                  <span class="text-primary font-weight-medium">{{ vc.bv2SdpRatio }}</span>
                </div>
                <p class="text-caption text-medium-emphasis">控制语音的情感丰富度</p>
                <v-slider
                  v-model="vc.bv2SdpRatio"
                  :min="0"
                  :max="1"
                  :step="0.1"
                  thumb-label
                  color="purple"
                  :disabled="disabled"
                />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="vc.bv2SegmentSize"
                  label="分段阈值"
                  variant="outlined"
                  density="compact"
                  type="number"
                  :disabled="disabled"
                  hint="文本分段处理的阈值"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="vc.bv2Lang"
                  label="语言"
                  variant="outlined"
                  density="compact"
                  :items="LANGUAGE_OPTIONS"
                  :disabled="disabled"
                  hint="选择生成语音的语言"
                  persistent-hint
                />
              </v-col>
            </v-row>
          </template>
        </div>
      </v-card-text>
    </v-card>

    <!-- VITS 安装组件 -->
    <VitsInstaller class="mt-6" />
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useVitsConfigStore, ENGINE_TYPES } from '../../stores/configs/vitsConfig';
import { probeSbv2 } from '../../services/chatAndVoice/sbv2Process';
import { probeBv2 } from '../../services/chatAndVoice/bv2Process';
import { startSbv2 } from '../../services/chatAndVoice/sbv2Process';
import VitsInstaller from './VitsInstaller.vue';

// 常量定义
// 使用共享的引擎类型常量
const LANGUAGE_OPTIONS = [
  { title: '中文', value: 'zh' },
  { title: '英文', value: 'en' },
  { title: '日文', value: 'ja' }
] as const;

// 测试相关
const testResult = ref<{ success: boolean; message: string } | null>(null);
const isTesting = ref(false);
const starting = ref(false);

const vc = useVitsConfigStore();

// 统一禁用态
const disabled = computed(() => !vc.on);

// 计算属性：引擎类型相关配置
const engineConfig = computed(() => {
  const isBertVits2 = vc.engineType === ENGINE_TYPES.BERT_VITS2;
  return {
    isBertVits2,
    isStyleBertVits2: !isBertVits2,
    serverLabel: isBertVits2 ? 'VITS Simple API 服务器地址' : 'Style-Bert-VITS2 API 地址',
    placeholder: isBertVits2 ? '127.0.0.1:6006 或 your-server.com:6006' : '127.0.0.1:23456 或 http://127.0.0.1:23456',
    hint: isBertVits2 ? '输入VITS Simple API服务器地址，自动调用/voice/bert-vits2接口' : '支持多种格式：127.0.0.1:23456 或 http://127.0.0.1:23456',
    speakerLabel: isBertVits2 ? '说话人ID' : '音色 ID',
    speakerHint: isBertVits2 ? '数字ID，如：0, 1, 2...' : 'ID 应与 onnx 模型一致，如：Murasame'
  };
});

// 测试连接
async function testConnection() {
  isTesting.value = true;
  testResult.value = null;

  try {
    // 根据引擎类型选择不同的测试方法
    if (engineConfig.value.isBertVits2) {
      await probeBv2();
    } else {
      await probeSbv2();
    }

    testResult.value = {
      success: true,
      message: `${engineConfig.value.isBertVits2 ? 'Bert-VITS2' : 'Style-Bert-VITS2'}服务连接成功！`
    };
  } catch (error) {
    console.error('测试连接失败:', error);
    testResult.value = {
      success: false,
      message: `连接失败：${error instanceof Error ? error.message : '未知错误'}`
    };
  } finally {
    isTesting.value = false;
  }
}

// 启动本地 sbv2_api 服务，并设置 vc.baseURL
async function startSbv2Api() {
  try {
    starting.value = true

    // 选择可执行文件路径：
    // macOS: 期待在 installPath 或 installPath 下解压产生 `sbv2_api` 二进制
    // Windows: 期待产生 `sbv2_api.exe`
  const base = vc.installPath
  if (!base) throw new Error('请先完成安装并选择安装目录')
  await startSbv2(base)
  testResult.value = { success: true, message: '启动成功！' }

  } catch (e: any) {
    console.error('启动失败:', e);
    testResult.value = { success: false, message: `启动失败：${e?.message || e}` }
  } finally {
    starting.value = false
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

.log-box {
  max-height: 200px;
  overflow: hidden;
}
.log-scroll {
  max-height: 196px;
  overflow-y: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre-wrap;
}
.log-line { color: rgba(0,0,0,.8); }
:deep(.v-theme--dark) .log-line { color: rgba(255,255,255,.85); }
</style>
