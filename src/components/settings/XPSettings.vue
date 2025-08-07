<template>
  <v-container>
    <v-card flat class="pa-2">
      <v-card-text>

        <div class="mb-8">
          <h2 class="text-h6 font-weight-bold mb-4">故事类型</h2>
          <v-divider class="mb-6"></v-divider>

          <div class="d-flex flex-wrap gap-2">
            <v-chip
              v-for="tag in STORY"
              :key="tag"
              :variant="xps.story.includes(tag) ? 'flat' : 'outlined'"
              :color="xps.story.includes(tag) ? 'primary' : 'default'"
              @click="toggleStoryTag(tag)"
              clickable
              size="small"
            >
              {{ tag }}
            </v-chip>
          </div>
        </div>

        <v-divider class="my-8"></v-divider>

        <div class="mb-8">
          <h2 class="text-h6 font-weight-bold mb-4">体位姿势</h2>
          <v-divider class="mb-6"></v-divider>

          <div class="d-flex flex-wrap gap-2">
            <v-chip
              v-for="tag in SEX_POS"
              :key="tag"
              :variant="xps.sexPos.includes(tag) ? 'flat' : 'outlined'"
              :color="xps.sexPos.includes(tag) ? 'primary' : 'default'"
              @click="toggleSexPosTag(tag)"
              clickable
              size="small"
            >
              {{ tag }}
            </v-chip>
          </div>
        </div>

        <v-divider class="my-8"></v-divider>

        <div>
          <v-btn @click="clearAll" color="error" variant="outlined" size="large" block>
            清除所有选择
          </v-btn>
        </div>

      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { useXPStore } from '../../stores/xp';
import { STORY, SEX_POS } from '../../constants/xp';

const xps = useXPStore();

// 切换故事标签选择状态
function toggleStoryTag(tag: string) {
  const index = xps.story.indexOf(tag);
  if (index > -1) {
    xps.story.splice(index, 1);
  } else {
    xps.addStory(tag);
  }
}

// 切换体位标签选择状态
function toggleSexPosTag(tag: string) {
  const index = xps.sexPos.indexOf(tag);
  if (index > -1) {
    xps.sexPos.splice(index, 1);
  } else {
    xps.addSexPos(tag);
  }
}

// 清除所有选择
function clearAll() {
  xps.story.splice(0);
  xps.sexPos.splice(0);
}
</script>

<style scoped>
.gap-2 {
  gap: 8px;
}
</style>