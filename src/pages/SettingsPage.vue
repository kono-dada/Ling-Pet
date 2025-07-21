<template>
    <v-layout class="settings-page bg-grey-lighten-5">

        <v-navigation-drawer permanent width="180">
            <v-list>
                <v-list-item class="px-4 pt-4 pb-3">
                    <v-list-item-title class="text-h6 font-weight-bold">
                        设置
                    </v-list-item-title>
                </v-list-item>
            </v-list>

            <v-divider></v-divider>

            <v-list v-model:selected="selectedTab" nav color="primary" density="compact" class="pa-2">
                <v-list-item v-for="tab in availableTabs" :key="tab.id" :value="tab.id"
                    :prepend-icon="iconMap[tab.icon]" :title="tab.name" @click="switchTab(tab.id)"
                    rounded="lg"></v-list-item>
            </v-list>
        </v-navigation-drawer>

        <v-main scrollable>
            <div class="main-header pa-5 bg-surface border-b">
                <h2 class="text-h5 font-weight-bold">{{ currentTab.name }}</h2>
            </div>

            <v-window v-model="currentTab.id" class="pa-3 pa-md-5">
                <v-window-item value="appearance" :transition="false">
                    <AppearanceSettings />
                </v-window-item>

                <v-window-item value="ai" :transition="false">
                    <AISettings />
                </v-window-item>

                <v-window-item value="about" :transition="false">
                    <AboutSettings />
                </v-window-item>
            </v-window>
        </v-main>
    </v-layout>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { SETTINGS_TABS, DEFAULT_ACTIVE_TAB } from "../constants/settings-ui";
import type { SettingsState } from '../types/settings-ui';
import AppearanceSettings from '../components/settings/AppearanceSettings.vue';
import AISettings from '../components/settings/AISettings.vue';
import AboutSettings from '../components/settings/AboutSettings.vue';

const settingsState = ref<SettingsState>({
    activeTab: DEFAULT_ACTIVE_TAB,
    isLoading: false,
});

// 计算属性
const currentTab = computed(() =>
    SETTINGS_TABS.find(tab => tab.id === settingsState.value.activeTab) || SETTINGS_TABS[0]
);

const availableTabs = computed(() => SETTINGS_TABS);

// ===================
// UI状态管理方法
// ===================

// 切换标签页
function switchTab(tabId: string) {
    const tab = SETTINGS_TABS.find(t => t.id === tabId);
    if (tab) {
        settingsState.value.activeTab = tabId;
    }
}

// Sync the Vuetify v-list's selected state with the application state
const selectedTab = ref([currentTab.value.id]);

// Watch for changes to the currentTab (e.g., from routing) to update the navigation
watch(currentTab, (newTab) => {
    if (selectedTab.value[0] !== newTab.id) {
        selectedTab.value = [newTab.id];
    }
});

// Map custom icon names to Material Design Icons
const iconMap: { [key: string]: string } = {
    appearance: 'mdi-palette-swatch-outline',
    ai: 'mdi-brain',
    about: 'mdi-information-outline'
};
</script>

<style scoped>
.settings-page {
    width: 100vw;
    height: 100vh;
    min-width: 800px;
    /* Optional: enforce a minimum size for usability */
    min-height: 600px;
}

/* Ensure v-main takes up the full height to allow for proper scrolling */
.v-main {
    height: 100vh;
}
</style>