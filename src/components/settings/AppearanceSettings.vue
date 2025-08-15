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
            <div class="d-flex align-center" style="gap: 8px">
              <v-chip size="small" color="secondary" label>当前：{{ currentPack || '未选择' }}</v-chip>
              <v-btn color="secondary" variant="outlined" @click="importPack">导入 ZIP...</v-btn>
            </div>
          </div>

          <v-row dense>
            <v-col v-for="p in previews" :key="p.name" cols="6" sm="4" md="3" lg="2">
              <v-card
                class="pack-card"
                :class="{ active: currentPack === p.name }"
                elevation="0"
                rounded="lg"
                variant="outlined"
                @click="activatePack(p.name)"
              >
                <v-img :src="p.src" :alt="p.name" aspect-ratio="1" cover class="pack-img" />
                <v-card-subtitle class="py-2 text-center" style="background: #e6e7e9">
                  <span class="text-truncate" style="max-width: 100%; display: inline-block;">{{ p.name }}</span>
                </v-card-subtitle>
              </v-card>
            </v-col>
          </v-row>
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
import { appDataDir } from '@tauri-apps/api/path'
import { readTextFile } from '@tauri-apps/plugin-fs'
import { convertFileSrc } from '@tauri-apps/api/core'

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
const currentPack = ref<string | null>(null)
type PackPreview = { name: string; src: string; code: number; defaultName: string }
const previews = ref<PackPreview[]>([])

function joinPath(a: string, b: string) {
  if (!a) return b
  return a.replace(/[\/]+$/, '') + '/' + b.replace(/^[\/]+/, '')
}

async function buildPreview(name: string): Promise<PackPreview | null> {
  try {
    const base = await appDataDir()
    const root = joinPath(joinPath(base, 'emotion_packs'), name)
    const cfgText = await readTextFile(joinPath(root, 'config.json'))
    const cfg = JSON.parse(cfgText) as { map: Record<string, number>; default: string }
    const def = cfg.default
    const code = cfg.map[def]
    if (typeof code !== 'number') return null
    const img = convertFileSrc(joinPath(root, `${code}.png`))
    return { name, src: img, code, defaultName: def }
  } catch (e) {
    console.warn('构建预览失败: ', name, e)
    return null
  }
}

async function refreshPacks() {
  const names = await listEmotionPacks()
  currentPack.value = await getActiveEmotionPack()
  const built = await Promise.all(names.map(buildPreview))
  previews.value = built.filter((x): x is PackPreview => !!x)
}

async function activatePack(name: string) {
  try {
    await setActiveEmotionPack(name)
    ac.activeEmotionPackName = name
    currentPack.value = name
  } catch (e) {
    console.error('切换表情包失败: ', e)
  }
}

async function importPack() {
  const picked = await open({ multiple: false, directory: false, filters: [{ name: 'Zip', extensions: ['zip'] }] })
  const file = Array.isArray(picked) ? picked[0] : picked
  if (!file) return
  await importEmotionPackFromZip(file)
  await refreshPacks()
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

.pack-card {
  cursor: pointer;
  transition: border-color .15s ease, background-color .15s ease;
  border: 1px solid color-mix(in oklab, rgb(var(--v-theme-outline-variant)) 60%, transparent);
}
.pack-card:hover { background-color: color-mix(in oklab, rgb(var(--v-theme-primary)) 6%, transparent); }
.pack-card.active { border-color: rgb(var(--v-theme-primary)); }
.pack-img { background: #f6f7f9; }
</style>