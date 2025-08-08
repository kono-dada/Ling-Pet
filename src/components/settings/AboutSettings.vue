<template>
  <v-container class="about-wrap py-4 py-sm-6">
    <!-- 顶部信息卡片：品牌 + 版本 -->
    <div class="hero glass mb-6">
      <v-avatar size="48" rounded="circle">
        <v-img src="/头像.png" alt="LingPet" cover></v-img>
      </v-avatar>
      <div class="hero-text">
        <div class="app-name">LingPet</div>
        <div class="app-desc">一个可爱的桌面宠物应用，基于 Tauri 与 Vue 构建。</div>
      </div>
      <v-chip class="ml-auto version-chip" color="primary" variant="flat" size="small" prepend-icon="mdi-tag-outline">
        v1.0.0
      </v-chip>
    </div>

    <!-- 内容两栏：系统信息 + 应用操作 -->
    <v-row dense class="g-4">
      <v-col cols="12" md="6">
        <div class="section-card glass">
          <div class="section-title">
            <v-icon size="18" icon="mdi-monitor-dashboard"></v-icon>
            <span>系统信息</span>
          </div>
          <v-divider class="soft-divider my-3"></v-divider>

          <div class="kv">
            <div class="label">平台</div>
            <div class="value">{{ sys.platform }} <span class="dim">({{ sys.type }})</span></div>

            <div class="label">版本</div>
            <div class="value">{{ sys.version }}</div>

            <div class="label">架构</div>
            <div class="value">{{ sys.arch }}</div>
          </div>
        </div>
      </v-col>

      <v-col cols="12" md="6">
        <div class="section-card glass">
          <div class="section-title">
            <v-icon size="18" icon="mdi-cog-outline"></v-icon>
            <span>应用操作</span>
          </div>
          <v-divider class="soft-divider my-3"></v-divider>

          <div class="btn-col">
            <v-btn block variant="flat" :elevation="0" color="primary" size="large" prepend-icon="mdi-folder-open-outline" @click="openDataFolder">
              打开数据文件夹
            </v-btn>
            <v-btn block variant="flat" :elevation="0" color="secondary" size="large" prepend-icon="mdi-message-text-outline" @click="openLingChat">
              打开 LingChat
            </v-btn>
            <v-btn block variant="flat" :elevation="0" color="error" size="large" prepend-icon="mdi-power" @click="quitApp">
              退出应用
            </v-btn>
          </div>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { getAllWebviewWindows, WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { platform, arch, type as osType, version, locale, hostname } from '@tauri-apps/plugin-os';

const sys = ref({ platform: '', arch: '', type: '', version: '', locale: '', hostname: '' });

onMounted(async () => {
  sys.value.platform = platform();
  sys.value.arch = arch();
  sys.value.type = osType();
  sys.value.version = version();
  sys.value.locale = await locale() ?? '—';
  sys.value.hostname = await hostname() ?? '—';
});

// ------- 新增结束 -------

// Quit the application
async function quitApp() {
  await invoke('quit_app')
}

// Open the application data folder
async function openDataFolder() {
  await invoke('open_data_folder')
}

async function openLingChat() {
  const allWindows = await getAllWebviewWindows()
  const lingChatWindow = allWindows.find(window => window.label === 'lingchat')
  if (lingChatWindow) {
    lingChatWindow?.close()
    return
  }
  const lingChatWindowConfig = {
    title: 'LingChat',
    url: '/#/lingchat',
    label: 'lingchat',
    width: 1080,
    height: 720,
    resizable: true,
    transparent: false,
    decorations: true,
    alwaysOnTop: false,
    skipTaskbar: true,
    center: false,
    visible: false,
  }
  new WebviewWindow('lingchat', {
    ...lingChatWindowConfig,
    visible: true
  })
}
</script>

<style scoped>
/* 容器宽度控制 */
.about-wrap {
  max-width: 960px;
  margin-inline: auto;
}

/* 玻璃拟态卡片通用样式 */
.glass {
  border-radius: 12px;
  border: 1px solid color-mix(in oklab, rgb(var(--v-theme-outline-variant)) 40%, transparent);
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  box-shadow: none;
}

/* 顶部信息区 */
.hero {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 14px;
}
.hero-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.app-name {
  font-weight: 700;
  letter-spacing: 0.3px;
}
.app-desc {
  font-size: 0.925rem;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.7;
}
.version-chip {
  font-weight: 600;
}

/* 分区卡片 */
.section-card {
  padding: 12px;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
.soft-divider {
  opacity: 0.12;
}

/* 键值栅格 */
.kv {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 10px 12px;
}
.kv .label {
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.6;
  font-size: 0.92rem;
}
.kv .value {
  color: rgb(var(--v-theme-on-surface));
  font-weight: 600;
}
.kv .dim {
  opacity: 0.55;
  font-weight: 500;
}

/* 按钮列 */
.btn-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (min-width: 1280px) {
  .section-card { padding: 20px; }
  .hero { padding: 18px 20px; }
}
</style>
