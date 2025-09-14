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
            <v-slider 
              v-model="ac.petSize" 
              :min="MIN_SIZE" 
              :max="MAX_SIZE" 
              :step="1" 
              thumb-label 
              hide-details
              color="primary"
            ></v-slider>
          </div>

          <div class="mb-6">
            <div class="d-flex justify-space-between align-center mb-1">
              <v-label>透明度</v-label>
              <span class="text-primary font-weight-medium">{{ formattedOpacity }}</span>
            </div>
            <v-slider 
              v-model="ac.opacity" 
              :min="MIN_OPACITY" 
              :max="MAX_OPACITY" 
              :step="0.01" 
              thumb-label 
              hide-details
              color="orange"
            ></v-slider>
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
            <div v-if="ac.avatarType === 'live2d'" class="text-caption text-medium-emphasis mt-2">
              Live2D模式下装饰效果将自动禁用
            </div>
          </div>

          <div class="mb-6">
            <div class="d-flex justify-space-between align-center mb-1">
              <v-label>Avatar类型</v-label>
              <span class="text-primary font-weight-medium">{{ avatarTypeLabel }}</span>
            </div>
            <v-select
              v-model="ac.avatarType"
              :items="avatarTypeOptions"
              item-title="label"
              item-value="value"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </div>

          <!-- Live2D边界类型设置（仅在Live2D模式下显示） -->
          <div v-if="ac.avatarType === 'live2d'" class="mb-6">
            <div class="d-flex justify-space-between align-center mb-1">
              <v-label>Live2D边界类型</v-label>
              <span class="text-primary font-weight-medium">{{ live2dBorderLabel }}</span>
            </div>
            <v-select
              v-model="ac.live2dBorderType"
              :items="live2dBorderOptions"
              item-title="label"
              item-value="value"
              density="comfortable"
              variant="outlined"
              hide-details
            />
            <div class="text-caption text-medium-emphasis mt-2">
              选择"无边界"可解决模型显示不全问题
            </div>
          </div>

          <!-- Live2D模型设置（仅在Live2D模式下显示） -->
          <div v-if="ac.avatarType === 'live2d'" class="mb-6">
            <h3 class="text-subtitle-1 font-weight-bold mb-3">Live2D模型设置</h3>
            
            <div class="mb-4">
              <div class="d-flex justify-space-between align-center mb-1">
                <v-label>模型缩放</v-label>
                <span class="text-primary font-weight-medium">{{ formattedScale }}</span>
              </div>
              <v-slider 
                v-model="ac.live2dModelScale" 
                :min="0.01" 
                :max="0.7" 
                :step="0.01" 
                thumb-label 
                hide-details
                color="primary"
              ></v-slider>
              <div class="text-caption text-medium-emphasis mt-1">
                调整模型大小，避免显示不全
              </div>
            </div>

            <div class="mb-4">
              <div class="d-flex justify-space-between align-center mb-1">
                <v-label>模型水平位置</v-label>
                <span class="text-primary font-weight-medium">{{ formattedPositionX }}</span>
              </div>
              <v-slider 
                v-model="ac.live2dModelPositionX" 
                :min="0" 
                :max="1" 
                :step="0.01" 
                thumb-label 
                hide-details
                color="primary"
              ></v-slider>
              <div class="text-caption text-medium-emphasis mt-1">
                调整模型水平位置 (0:最左, 1:最右)
              </div>
            </div>

            <div class="mb-4">
              <div class="d-flex justify-space-between align-center mb-1">
                <v-label>模型垂直位置</v-label>
                <span class="text-primary font-weight-medium">{{ formattedPositionY }}</span>
              </div>
              <v-slider 
                v-model="ac.live2dModelPositionY" 
                :min="0" 
                :max="1" 
                :step="0.01" 
                thumb-label 
                hide-details
                color="primary"
              ></v-slider>
              <div class="text-caption text-medium-emphasis mt-1">
                调整模型垂直位置 (0:最上, 1:最下)
              </div>
            </div>
          </div>

          <div class="mb-6">
            <div class="d-flex justify-space-between align-center mb-3">
              <div class="d-flex align-center gap-2">
                <v-label>聊天气泡透明模式</v-label>
              </div>
              <v-switch
                v-model="ac.bubbleTransparent"
                color="primary"
                density="compact"
                hide-details
              />
            </div>
            <div class="text-caption text-medium-emphasis mb-3">
              开启后气泡背景将变为透明
            </div>
            
            <!-- 边框显示选项（仅在透明模式下显示） -->
            <div v-if="ac.bubbleTransparent" class="ml-4">
              <div class="d-flex justify-space-between align-center mb-2">
                <v-label class="text-body-2">显示边框</v-label>
                <v-switch
                  v-model="ac.bubbleShowBorder"
                  color="secondary"
                  density="compact"
                  hide-details
                />
              </div>
              <div class="text-caption text-medium-emphasis">
                关闭后仅显示文字，达到最简洁的效果
              </div>
            </div>
          </div>

          <v-divider class="my-6"></v-divider>

          <div class="mb-6">
            <div class="d-flex justify-space-between align-center mb-3">
              <v-label>开发者工具</v-label>
              <v-switch
                v-model="ac.showDevTools"
                color="warning"
                density="compact"
                hide-details
              />
            </div>
            <div class="text-caption text-medium-emphasis mb-3">
              开启后可在设置与聊天记录界面使用右键开发者工具，关闭以获得更好的使用体验
            </div>
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
import { useAppearanceConfigStore } from '../../stores/configs/appearanceConfig';
import { listEmotionPacks, getActiveEmotionPack, importEmotionPackFromZip, setActiveEmotionPack } from '../../services/emotionPack'
import { open } from '@tauri-apps/plugin-dialog'
import { appDataDir } from '@tauri-apps/api/path'
import { readTextFile } from '@tauri-apps/plugin-fs'
import { convertFileSrc } from '@tauri-apps/api/core'

// Constants
const MIN_SIZE = 50;
const MAX_SIZE = 500;
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

// Avatar类型选项
const avatarTypeOptions = [
  { label: '静态图片', value: 'image' },
  { label: 'Live2D', value: 'live2d' },
];

const avatarTypeLabel = computed(() => {
  const found = avatarTypeOptions.find(o => o.value === ac.avatarType);
  return found ? found.label : '静态图片';
});

// Live2D边界类型选项
const live2dBorderOptions = [
  { label: '无边界', value: 'none' },
  { label: '圆形边界', value: 'circle' },
];

const live2dBorderLabel = computed(() => {
  const found = live2dBorderOptions.find(o => o.value === ac.live2dBorderType);
  return found ? found.label : '无边界';
});

// Computed property to format the opacity value for display
const formattedOpacity = computed(() => `${Math.round(ac.opacity * 100)}%`);

// Computed properties for Live2D model settings
const formattedScale = computed(() => `${Math.round(ac.live2dModelScale * 100)}%`);
const formattedPositionX = computed(() => `${Math.round(ac.live2dModelPositionX * 100)}%`);
const formattedPositionY = computed(() => `${Math.round(ac.live2dModelPositionY * 100)}%`);

// 表情包管理状态
const currentPack = ref<string | null>(null)
type PackPreview = { name: string; src: string; code: number;}
const previews = ref<PackPreview[]>([])

/**
 * 连接路径
 */
function joinPath(a: string, b: string) {
  if (!a) return b
  return a.replace(/[\/]+$/, '') + '/' + b.replace(/^[\/]+/, '')
}

/**
 * 构建表情包预览
 */
async function buildPreview(name: string): Promise<PackPreview | null> {
  try {
    const base = await appDataDir()
    const root = joinPath(joinPath(base, 'emotion_packs'), name)
    const cfgText = await readTextFile(joinPath(root, 'config.json'))
    const cfg = JSON.parse(cfgText) as { map: Record<string, number>; default: number }
    const code = cfg.default
    if (typeof code !== 'number') return null
    const img = convertFileSrc(joinPath(root, `${code}.png`))
    return { name, src: img, code }
  } catch (error) {
    console.warn('构建预览失败: ', name, error)
    return null
  }
}

/**
 * 刷新表情包列表
 */
async function refreshPacks() {
  try {
    const names = await listEmotionPacks()
    currentPack.value = await getActiveEmotionPack()
    const built = await Promise.all(names.map(buildPreview))
    previews.value = built.filter((x): x is PackPreview => !!x)
  } catch (error) {
    console.error('刷新表情包列表失败:', error)
  }
}

/**
 * 激活表情包
 */
async function activatePack(name: string) {
  try {
    await setActiveEmotionPack(name)
    ac.activeEmotionPackName = name
    currentPack.value = name
  } catch (error) {
    console.error('切换表情包失败: ', error)
  }
}

/**
 * 导入表情包
 */
async function importPack() {
  try {
    const picked = await open({ 
      multiple: false, 
      directory: false, 
      filters: [{ name: 'Zip', extensions: ['zip'] }] 
    })
    const file = Array.isArray(picked) ? picked[0] : picked
    if (!file) return
    await importEmotionPackFromZip(file)
    await refreshPacks()
  } catch (error) {
    console.error('导入表情包失败:', error)
  }
}

onMounted(() => { 
  refreshPacks() 
})
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