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

          <div class="mb-6">
            <div class="d-flex justify-space-between align-center mb-1">
              <v-label>装饰效果</v-label>
              <span class="text-primary font-weight-medium">{{ decorationLabel }}</span>
            </div>
            <v-select
              v-model="ac.decorationType"
              :items="decorationOptions"
              item-title="label"
              item-value="value"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </div>

          <v-divider class="my-6"></v-divider>

          <div class="mb-3 d-flex justify-space-between align-center">
            <h3 class="text-subtitle-1 font-weight-bold">表情包管理</h3>
            <v-chip size="small" color="secondary" label>当前：{{ currentPack || '未选择' }}</v-chip>
          </div>
          <div class="d-flex align-center" style="gap: 8px">
            <v-select
              v-model="selectedPack"
              :items="packOptions"
              label="可用表情包"
              density="comfortable"
              variant="outlined"
              hide-details
              style="max-width: 280px"
            />
            <v-btn color="primary" @click="applyPack" :disabled="!selectedPack">应用</v-btn>
            <v-btn color="secondary" variant="outlined" @click="importPack">导入 ZIP...</v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useAppearanceConfigStore } from '../../stores/appearanceConfig';
import { listEmotionPacks, getActiveEmotionPack, importEmotionPackFromZip, setActiveEmotionPack } from '../../services/emotionPack'
import { open } from '@tauri-apps/plugin-dialog'

// Constants
const MIN_SIZE = 100;
const MAX_SIZE = 300;
const MIN_OPACITY = 0.1;
const MAX_OPACITY = 1.0;

// State management
const ac = useAppearanceConfigStore();

// 装饰选项（未来可在此扩展）
const decorationOptions = [
  { label: '无', value: 'none' },
  { label: '光圈 (Circle)', value: 'circle' },
  { label: '飘落星光 (Falling Stars)', value: 'fallingStars' },
];

const decorationLabel = computed(() => {
  const found = decorationOptions.find(o => o.value === ac.decorationType);
  return found ? found.label : '无';
});

// Computed property to format the opacity value for display
const formattedOpacity = computed(() => `${Math.round(ac.opacity * 100)}%`);

// 表情包管理状态
const packOptions = ref<string[]>([])
const selectedPack = ref<string>('')
const currentPack = ref<string | null>(null)

async function refreshPacks() {
  packOptions.value = await listEmotionPacks()
  currentPack.value = await getActiveEmotionPack()
  if (currentPack.value && packOptions.value.includes(currentPack.value)) {
    selectedPack.value = currentPack.value
  } else {
    selectedPack.value = packOptions.value[0] ?? ''
  }
}

async function applyPack() {
  if (!selectedPack.value) return
  // 仅写入全局 store，交由主窗口监听后切换
  setActiveEmotionPack(selectedPack.value)
  ac.activeEmotionPackName = selectedPack.value
  await refreshPacks()
}

async function importPack() {
  const picked = await open({ multiple: false, directory: false, filters: [{ name: 'Zip', extensions: ['zip'] }] })
  const file = Array.isArray(picked) ? picked[0] : picked
  if (!file) return
  await importEmotionPackFromZip(file)
  await refreshPacks()
  if (selectedPack.value) ac.activeEmotionPackName = selectedPack.value
}

onMounted(() => { refreshPacks() })

</script>

<style scoped>
/* All major styles are handled by Vuetify, this can be left empty or for minor tweaks. */
.v-label {
  font-size: 1rem;
  font-weight: 500;
  opacity: 1;
}
</style>