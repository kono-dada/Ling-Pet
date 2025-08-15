<template>
  <v-container>
    <v-card flat class="pa-2">
      <v-card-title class="py-3 d-flex align-center justify-space-between">
        <div>
          <div class="text-h6 font-weight-bold">VITS 语音服务</div>
          <div class="text-caption text-medium-emphasis mt-1">基于 Style-Bert-VITS2 的本地 TTS</div>
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
            <span class="mr-1">请先正确配置或安装sbv2_api（在页面底部）</span>
          </div>
        </v-alert>

        <!-- 连接与服务 -->
        <div :class="{ 'text-disabled': disabled }">
          <h3 class="text-subtitle-1 font-weight-medium mb-3">连接与服务</h3>
          <v-row>
            <v-col cols="12" md="7">
              <v-text-field
                v-model="vc.baseURL"
                label="VITS API 基础地址"
                variant="outlined"
                density="compact"
                class="mb-4"
                :disabled="disabled"
                placeholder="http://127.0.0.1:23456"
                hint="本地服务请填写：http://localhost:23456"
                persistent-hint
              />
            </v-col>
            <v-col cols="12" md="5">
              <v-text-field
                v-model="vc.ident"
                label="音色 ID"
                variant="outlined"
                density="compact"
                :disabled="disabled"
                hint="ID 应与 onnx 模型一致，如：Murasame"
                persistent-hint
              />
            </v-col>
          </v-row>

          <v-row class="align-center">
            <v-col cols="12" md="6">
              <v-switch
                v-model="vc.autoStartSbv2"
                color="secondary"
                :disabled="disabled"
                hide-details
                label="应用启动时自动启动本地 sbv2_api"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-btn
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
        </div>
      </v-card-text>
    </v-card>

    <!-- VITS 安装组件 -->
    <VitsInstaller class="mt-6" />
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useVitsConfigStore } from '../../stores/vitsConfig';
import { probeSbv2 } from '../../services/chatAndVoice/sbv2Process';
import { startSbv2 } from '../../services/chatAndVoice/sbv2Process';
import VitsInstaller from './VitsInstaller.vue';

// 测试相关
const testResult = ref<{ success: boolean; message: string } | null>(null);
const isTesting = ref(false);
const starting = ref(false);

const vc = useVitsConfigStore();
// 使用 plugin-shell，无需事件总线

// 统一禁用态
const disabled = computed(() => !vc.on)

// 测试连接
async function testConnection() {
  isTesting.value = true;
  testResult.value = null;

  try {
    // 使用简短的测试文本
    await probeSbv2()

    testResult.value = {
      success: true,
      message: 'VITS服务连接成功！'
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
