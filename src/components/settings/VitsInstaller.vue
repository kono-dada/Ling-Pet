<template>
  <v-card flat class="pa-2">
    <v-card-text>
      <div class="d-flex align-center justify-space-between mb-2">
        <h2 class="text-h6 font-weight-bold">VITS 安装</h2>
        <span class="text-caption text-medium-emphasis">安装约需 1.8 GB 存储空间</span>
      </div>
      <v-divider class="mb-4"></v-divider>

      <!-- 安装类型选择 -->
      <div class="mb-4">
        <h3 class="text-subtitle-1 font-weight-medium mb-3">安装类型</h3>
        <v-btn-toggle
          v-model="installType"
          color="primary"
          mandatory
          variant="outlined"
          divided
          class="mb-3"
        >
          <v-btn value="style-bert-vits2">
            <v-icon start>mdi-microphone</v-icon>
            Style-Bert-VITS2
          </v-btn>
          <v-btn value="vits-simple-api">
            <v-icon start>mdi-microphone-variant</v-icon>
            VITS-Simple-API
          </v-btn>
        </v-btn-toggle>
        <v-alert type="info" variant="tonal" density="compact" class="mb-4">
          <div v-if="installType === 'style-bert-vits2'">
            <strong>Style-Bert-VITS2:</strong> 适用于本地部署，支持情感控制。需要下载模型文件和可执行文件。
          </div>
          <div v-else>
            <strong>VITS-Simple-API:</strong> 适用于Bert-VITS2远程API调用。支持多种模型，可部署在本地或远程服务器。
          </div>
        </v-alert>
      </div>

      <v-alert v-if="!osSupported" type="warning" variant="tonal" class="mb-4">
        当前系统不支持安装。当前仅支持：macOS 与 Windows。
      </v-alert>

      <!-- VITS-Simple-API 远程配置信息 -->
      <v-alert v-if="installType === 'vits-simple-api'" type="info" variant="tonal" class="mb-4">
        <div class="text-subtitle-2 mb-2">🔗 远程部署指南</div>
        <div class="text-body-2 mb-2">
          如果您已有远程服务器，可以直接在服务器上安装 VITS-Simple-API：
        </div>
        <div class="text-caption mb-2">
          <code>git clone https://github.com/Artrajz/vits-simple-api.git</code><br>
          <code>cd vits-simple-api && pip install -r requirements.txt</code><br>
          <code>python app.py</code>
        </div>
        <div class="text-body-2">
          然后在上方的 API 地址中配置您的远程服务器地址。
        </div>
      </v-alert>

      <div class="d-flex align-center gap-2 mb-2" style="gap: 8px" :class="{ 'text-disabled': !osSupported }">
        <v-text-field v-model="vc.installPath" :disabled="!osSupported" label="保存目录" density="compact" variant="outlined" hide-details
          placeholder="/Users/you/Downloads" :hint="pathHint" persistent-hint></v-text-field>
        <v-btn :disabled="!osSupported" color="secondary" @click="pickDir" prepend-icon="mdi-folder">选择目录</v-btn>
        <v-btn :disabled="!osSupported" color="secondary" @click="ensureCurrentDir" prepend-icon="mdi-folder-plus">创建/校验</v-btn>
      </div>
      <div class="text-caption mb-4" :class="pathExists === true ? 'text-success' : pathExists === false ? 'text-warning' : ''">
        {{ pathExists === true ? '目录存在' : pathExists === false ? '目录将被创建' : '请输入路径' }}
      </div>

      <div class="d-flex align-center gap-2 mb-4" style="gap: 8px" :class="{ 'text-disabled': !osSupported }">
        <v-switch :disabled="!osSupported" v-model="overwrite" color="primary" label="覆盖已存在文件" hide-details></v-switch>
        <v-spacer />
        <v-btn :disabled="!osSupported || !vc.installPath || isBatchDownloading" :color="!isBatchDownloading ? 'primary' : 'warning'" @click="startInstall">
          {{ isBatchDownloading ? '安装中...请勿关闭本页面' : `安装（${items.length} 项）` }}
        </v-btn>
        <v-btn :disabled="!isBatchDownloading" color="error" variant="outlined" @click="cancelBatch">取消</v-btn>
      </div>

      <v-progress-linear
        v-if="items.length"
        :model-value="totalProgress"
        color="primary"
        height="8"
        class="mb-4"
        :indeterminate="items.some(i => i.progress === null && i.status === 'downloading')"
      ></v-progress-linear>

      <v-list density="compact" class="rounded">
        <v-list-item v-for="item in items" :key="item.url">
          <template #title>
            <div class="d-flex align-center justify-space-between">
              <span class="text-truncate" style="max-width: 60%">{{ item.name }}</span>
              <span class="text-caption">{{ statusText(item.status) }}</span>
            </div>
          </template>
          <template #subtitle>
            <v-progress-linear
              :model-value="item.progress ?? 0"
              color="primary"
              height="6"
              :indeterminate="item.progress === null && (item.status === 'downloading' || item.status === 'extracting')"
              class="mt-2"
            ></v-progress-linear>
            <div v-if="item.error" class="text-error mt-1 text-caption">{{ item.error }}</div>
          </template>
          <template #append>
            <v-tooltip :text="item.url" location="bottom">
              <template #activator="{ props }">
                <v-btn v-bind="props" icon="mdi-link" variant="text" density="comfortable" @click="openItemUrl(item)" />
              </template>
            </v-tooltip>
            <v-btn size="small" variant="text" color="error" @click="cancelOne(item)" :disabled="item.status !== 'downloading'">取消</v-btn>
          </template>
        </v-list-item>
      </v-list>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useVitsConfigStore } from '../../stores/configs/vitsConfig';
import { openUrl } from '@tauri-apps/plugin-opener';
import { exists, mkdir, writeFile } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-dialog';
import { useDownloader } from '../../composables/useDownloader';
import { type as osType } from '@tauri-apps/plugin-os';
// 保留 fflate 仅用于小文件（若未来需要），大文件改为系统原生命令解压
// import { unzipSync } from 'fflate';
import { Command } from '@tauri-apps/plugin-shell';
import { debug } from '@tauri-apps/plugin-log';

// 类型定义
type ItemStatus = 'pending' | 'downloading' | 'extracting' | 'done' | 'error' | 'canceled'
interface DownloadItem {
  url: string
  name: string
  progress: number | null
  status: ItemStatus
  error?: string
  cancel?: () => void
  kind: 'file' | 'zip'
}

// 响应式数据
const overwrite = ref(false)
const isBatchDownloading = ref(false)
const items = ref<DownloadItem[]>([])
const pathExists = ref<boolean | null>(null)
const installType = ref<'style-bert-vits2' | 'vits-simple-api'>('style-bert-vits2')

const vc = useVitsConfigStore();

// 安装清单
const INSTALL_MANIFEST = {
  'style-bert-vits2': {
    files: {
      'configuration.json': 'https://modelscope.cn/models/konodada/PET-sbv2/resolve/master/configuration.json',
      'deberta.onnx': 'https://modelscope.cn/models/konodada/PET-sbv2/resolve/master/deberta.onnx',
      'model_Murasame.onnx': 'https://modelscope.cn/models/konodada/PET-sbv2/resolve/master/model_Murasame.onnx',
      'style_vectors_Murasame.json': 'https://modelscope.cn/models/konodada/PET-sbv2/resolve/master/style_vectors_Murasame.json',
      'tokenizer.json': 'https://modelscope.cn/models/konodada/PET-sbv2/resolve/master/tokenizer.json',
    },
    binary: {
      macos: {
        'sbv2_api_mac_arm64.zip': 'https://modelscope.cn/models/konodada/PET-sbv2/resolve/master/sbv2_api_mac_arm64.zip'
      },
      windows: {
        'sbv2_api_win_x64.zip': 'https://www.modelscope.cn/models/konodada/PET-sbv2/resolve/master/sbv2_api_win_x64.zip'
      }
    }
  },
  'vits-simple-api': {
    files: {},
    binary: {
      macos: {
        'vits-simple-api-macos.zip': 'https://github.com/Artrajz/vits-simple-api/releases/latest/download/vits-simple-api-macos.zip'
      },
      windows: {
        'vits-simple-api-windows.zip': 'https://github.com/Artrajz/vits-simple-api/releases/latest/download/vits-simple-api-windows.zip'
      }
    }
  }
} as const

// 计算属性
const currentOs = osType()
const osSupported = computed(() => currentOs === 'macos' || currentOs === 'windows')
const pathHint = computed(() => pathExists.value === true ? '目录存在' : pathExists.value === false ? '目录将被创建' : '请输入路径')

const totalProgress = computed(() => {
  if (!items.value.length) return 0
  const vals = items.value.map(i => {
    if (i.progress === null) {
      if (i.status === 'done') return 100
      if (i.status === 'extracting') return 75
      if (i.status === 'downloading') return 50
      return 0
    }
    return i.progress
  })
  const sum = vals.reduce((a, b) => a + (b || 0), 0)
  return Math.round(sum / items.value.length)
})

// 监听路径变化
watch(() => (vc as any).installPath, async (val: string) => {
  if (!val) { pathExists.value = null; return }
  try {
    pathExists.value = await exists(val)
  } catch {
    pathExists.value = false
  }
}, { immediate: true })

// 监听安装类型变化
watch(installType, () => {
  prepareItems()
}, { immediate: false })

// 工具函数
function joinPath(dir: string, name: string) {
  return `${dir.replace(/\/+$/, '')}/${name}`
}

async function ensureDir(path: string) {
  if (!(await exists(path))) {
    await mkdir(path, { recursive: true })
  }
}

// 生成安装项目
function prepareItems() {
  const list: DownloadItem[] = []
  const manifest = INSTALL_MANIFEST[installType.value]
  
  // 常规文件
  Object.entries(manifest.files).forEach(([name, url]) => {
    list.push({ url, name, progress: 0, status: 'pending', kind: (name.endsWith('.zip') ? 'zip' : 'file') })
  })
  
  // 二进制按平台
  if (currentOs === 'macos') {
    Object.entries(manifest.binary.macos || {}).forEach(([name, url]) => {
      list.push({ url, name, progress: 0, status: 'pending', kind: 'zip' })
    })
  } else if (currentOs === 'windows') {
    Object.entries(manifest.binary.windows || {}).forEach(([name, url]) => {
      list.push({ url, name, progress: 0, status: 'pending', kind: 'zip' })
    })
  }
  
  items.value = list
}

// UI 交互函数
async function pickDir() {
  try {
    const picked = await open({ directory: true, multiple: false })
    if (typeof picked === 'string') {
      (vc as any).installPath = picked
    } else if (Array.isArray(picked) && picked[0]) {
      (vc as any).installPath = picked[0]
    }
  } catch (e) {
    console.error('选择目录失败：', e)
  }
}

async function ensureCurrentDir() {
  if (!vc.installPath) return
  await ensureDir(vc.installPath)
  pathExists.value = true
}

function statusText(status: ItemStatus) {
  switch (status) {
    case 'pending': return '待开始'
    case 'downloading': return '下载中'
    case 'extracting': return '解压中'
    case 'done': return '完成'
    case 'error': return '错误'
    case 'canceled': return '已取消'
  }
}

function openItemUrl(item: DownloadItem) {
  try { openUrl(item.url) } catch (e) { console.error(e) }
}

// 下载和安装函数
async function downloadOne(item: DownloadItem) {
  item.status = 'downloading'
  item.error = undefined
  const { progress, downloadToFile, cancel } = useDownloader()
  item.cancel = () => cancel()

  try {
    await ensureDir(vc.installPath)
    const fullPath = joinPath(vc.installPath, item.name)
    if (!overwrite.value && await exists(fullPath)) {
      // 跳过已存在
      item.status = 'done'
      item.progress = 100
      return
    }

    // 绑定进度并直接写入磁盘
    const stop = watch(progress, (v) => { item.progress = v ?? null })
    await downloadToFile(item.url, fullPath)
    stop()
    debug(`下载完成: ${item.name}, ${item.kind}`)

    if (item.kind === 'zip') {
      item.status = 'extracting'
      item.progress = null
      await extractZipFile(fullPath, vc.installPath)
      // macOS/Linux: 给予可执行权限
      if (currentOs === 'macos' || currentOs === 'linux') {
        const exePath = installType.value === 'style-bert-vits2' 
          ? joinPath(vc.installPath, 'sbv2_api')
          : joinPath(vc.installPath, 'vits-simple-api')
        try { await Command.create('chmod', ['+x', exePath]).spawn() } catch (err) {
          console.warn('设置可执行权限失败，请手动 chmod +x：', exePath, err)
        }
      }
    }
    item.status = 'done'
    item.progress = 100
  } catch (e: any) {
    if (String(e?.name || e).includes('Abort')) {
      item.status = 'canceled'
      item.error = '已取消'
    } else {
      item.status = 'error'
      item.error = e?.message || String(e)
    }
  }
}

async function startInstall() {
  if (!vc.installPath || !osSupported.value) return
  isBatchDownloading.value = true
  for (const it of items.value) { it.status = 'pending'; it.progress = 0; it.error = undefined }
  try {
    const results = await Promise.allSettled(items.value.map(it => downloadOne(it)))
    const hasError = results.some(r => r.status === 'rejected') || items.value.some(i => i.status === 'error' || i.status === 'canceled')
    if (!hasError && installType.value === 'style-bert-vits2') {
      await writeEnvFile()
    }
  } finally {
    isBatchDownloading.value = false
  }
}

function cancelOne(item: DownloadItem) {
  item.cancel?.()
}

function cancelBatch() {
  for (const it of items.value) it.cancel?.()
}

// 使用系统原生命令解压磁盘上的 zip 文件，避免将压缩包解到内存
async function extractZipFile(zipPath: string, destDir: string): Promise<void> {
  await ensureDir(destDir)
  if (currentOs === 'windows') {
    // 使用 PowerShell Expand-Archive -Force
    await Command.create('powershell', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `Expand-Archive -LiteralPath \"${zipPath}\" -DestinationPath \"${destDir}\" -Force`
    ]).execute()
  } else {
    // macOS / Linux 常见为 unzip，部分环境也可用 tar -xf
    try {
      await Command.create('unzip', ['-o', zipPath, '-d', destDir]).execute()
    } catch {
      await Command.create('tar', ['-xf', zipPath, '-C', destDir]).execute()
    }
  }
}

async function writeEnvFile() {
  const lines = [
    'BERT_MODEL_PATH=deberta.onnx',
    'MODELS_PATH=.',
    'TOKENIZER_PATH=tokenizer.json',
    'ADDR=localhost:23456',
    'RUST_LOG=info',
    'HOLDER_MAX_LOADED_MODElS=20',
    'AGPL_DICT_PATH=all.bin'
  ]
  const content = lines.join('\n') + '\n'
  const envPath = joinPath(vc.installPath, '.env')
  await writeFile(envPath, new TextEncoder().encode(content))
}

// 初始化
prepareItems()
</script>

<style scoped>
.text-disabled {
  opacity: 0.6;
}
</style>
