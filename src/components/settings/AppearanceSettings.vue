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
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAppearanceConfigStore } from '../../stores/appearanceConfig';

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

</script>

<style scoped>
/* All major styles are handled by Vuetify, this can be left empty or for minor tweaks. */
.v-label {
  font-size: 1rem;
  font-weight: 500;
  opacity: 1;
}
</style>