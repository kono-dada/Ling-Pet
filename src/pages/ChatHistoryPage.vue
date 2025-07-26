<template>
  <v-container fluid class="pa-4 chat-history-container">
    <!-- 标题区域 -->
    <div class="text-center mb-6">
      <h2 class="text-h5 font-weight-light text-grey-darken-2">
        <v-icon class="mr-2" color="primary">mdi-chat-outline</v-icon>
        聊天记录
      </h2>
    </div>

    <!-- 聊天记录列表 -->
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <div class="chat-messages">
          <template v-for="(message, index) in chs.chatHistory" :key="index">
            <!-- 用户消息 -->
            <div v-if="message.role === 'user'" class="message-row user-message mb-4">
              <div class="d-flex justify-end">
                <v-card class="message-bubble user-bubble" rounded="xl">
                  <v-card-text class="pa-3">
                    {{ message.content }}
                  </v-card-text>
                </v-card>
                <v-avatar class="ml-3 user-avatar" size="40">
                  <v-icon color="white">mdi-account</v-icon>
                </v-avatar>
              </div>
            </div>

            <!-- AI消息 -->
            <div v-if="message.role === 'assistant'" class="message-row ai-message mb-4">
              <template v-for="aiMsg in parseAIMessage(message.content)" :key="aiMsg.chinese + aiMsg.emotion">
                <div class="d-flex justify-start mb-3">
                  <v-avatar class="mr-3 ai-avatar" size="40">
                    <v-img :src="`/avatar/${aiMsg.emotion}.png`" :alt="aiMsg.emotion" cover />
                  </v-avatar>
                  <v-card class="message-bubble ai-bubble" rounded="xl" :style="getEmotionStyle(aiMsg.emotion)">
                    <v-card-text class="pa-3">
                      {{ aiMsg.chinese }}
                    </v-card-text>
                  </v-card>
                </div>
              </template>
            </div>
          </template>

          <!-- 空状态 -->
          <div v-if="chs.chatHistory.length === 0" class="text-center py-8">
            <v-icon size="64" color="grey-lighten-2">mdi-chat-sleep-outline</v-icon>
            <p class="text-grey mt-4">还没有聊天记录呢</p>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- 统计信息 -->
    <v-row justify="center" class="mt-8">
      <v-col cols="12" md="6" lg="4" xl="3">
        <v-card class="stats-card" rounded="lg">
          <v-card-title class="text-h6 font-weight-light pb-2">
            <v-icon class="mr-2" color="primary">mdi-chart-line</v-icon>
            聊天统计
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="6" xs="6" sm="6" md="12">
                <div class="stat-item text-center">
                  <div class="stat-number text-h4 primary--text">{{ totalMessages }}</div>
                  <div class="stat-label text-caption text-grey">总消息数</div>
                </div>
              </v-col>
              <v-col cols="6" xs="6" sm="6" md="12">
                <div class="stat-item text-center">
                  <div class="stat-number text-h4 success--text">{{ totalCharacters }}</div>
                  <div class="stat-label text-caption text-grey">总字符数</div>
                </div>
              </v-col>
              <v-col cols="6" xs="6" sm="6" md="12">
                <div class="stat-item text-center">
                  <div class="stat-number text-h4 warning--text">{{ averageLength }}</div>
                  <div class="stat-label text-caption text-grey">平均长度</div>
                </div>
              </v-col>
              <v-col cols="6" xs="6" sm="6" md="12">
                <div class="stat-item text-center">
                  <div class="stat-number text-h4 info--text">{{ mostFrequentEmotion }}</div>
                  <div class="stat-label text-caption text-grey">常见情绪</div>
                </div>
              </v-col>
            </v-row>

            <!-- 情绪分布 -->
            <v-divider class="my-4"></v-divider>
            <div class="emotion-stats">
              <h4 class="text-subtitle-1 mb-3 text-grey-darken-1">情绪分布</h4>
              <div class="emotion-chips">
                <v-chip v-for="[emotion, count] in sortedEmotions" :key="emotion" class="ma-1" size="small"
                  :color="getEmotionChipColor(emotion)" variant="tonal">
                  {{ emotion }} ({{ count }})
                </v-chip>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row class="clear-btn-bar">
      <v-btn color="error" variant="flat" @click="clearDialog = true">
        <v-icon left>mdi-delete-outline</v-icon>
        清空聊天记录
      </v-btn>
    </v-row>
  </v-container>
  <v-dialog v-model="clearDialog" max-width="320">
    <v-card>
      <v-card-title class="text-h6">确认清空</v-card-title>
      <v-card-text>确定要清空所有聊天记录吗？此操作不可恢复。</v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text @click="clearDialog = false">取消</v-btn>
        <v-btn color="error" text @click="handleClear">清空</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useChatHistoryStore } from '../stores/chatHistory';
import { getEmotionColorTheme } from '../constants/emotionColors';
import { isEmotionName, type EmotionName } from '../types/emotion';
import { ref } from 'vue';

const chs = useChatHistoryStore();

interface ParsedAIMessage {
  chinese: string;
  japanese: string;
  emotion: EmotionName;
}

// 解析AI消息
function parseAIMessage(content: string | Array<any> | null | undefined): ParsedAIMessage[] {
  // 处理OpenAI SDK的复杂内容类型
  let contentString: string = '';
  
  if (typeof content === 'string') {
    contentString = content;
  } else if (Array.isArray(content)) {
    // 如果是数组，尝试提取文本内容
    contentString = content
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join(' ');
  } else {
    return [];
  }

  if (!contentString) {
    return [];
  }
  try {
    // 提取JSON数组部分
    const jsonMatch = contentString.match(/\[([\s\S]*)\]/);
    if (!jsonMatch) return [];

    const jsonStr = '[' + jsonMatch[1] + ']';
    const parsed = JSON.parse(jsonStr);

    return parsed.map((item: string) => {
      const parts = item.split('|');
      if (parts.length === 3) {
        const emotion = parts[2].trim();
        return {
          chinese: parts[0].trim(),
          japanese: parts[1].trim(),
          emotion: isEmotionName(emotion) ? emotion : '正常'
        };
      }
      return {
        chinese: item,
        japanese: '',
        emotion: '正常' as EmotionName
      };
    });
  } catch (error) {
    console.error('解析AI消息失败:', error);
    return [];
  }
}

// 获取情绪样式
function getEmotionStyle(emotion: EmotionName) {
  const theme = getEmotionColorTheme(emotion);
  return {
    backgroundColor: theme.background,
    borderColor: theme.border,
    color: theme.text,
    boxShadow: `0 2px 8px ${theme.shadow}`
  };
}

// 获取情绪芯片颜色
function getEmotionChipColor(emotion: string) {
  const positiveEmotions = ['高兴', '兴奋', '心动', '调皮', '自信'];
  const negativeEmotions = ['伤心', '生气', '害怕', '担心', '无奈'];

  if (positiveEmotions.includes(emotion)) return 'success';
  if (negativeEmotions.includes(emotion)) return 'error';
  return 'primary';
}

// 计算统计数据
const totalMessages = computed(() => chs.chatHistory.length);

const totalCharacters = computed(() => {
  return chs.chatHistory.reduce((total, msg) => {
    if (msg.role === 'user') {
      return total + msg.content.length;
    } else {
      const parsed = parseAIMessage(msg.content);
      return total + parsed.reduce((sum, item) => sum + item.chinese.length, 0);
    }
  }, 0);
});

const averageLength = computed(() => {
  if (totalMessages.value === 0) return 0;
  return Math.round(totalCharacters.value / totalMessages.value);
});

const emotionCounts = computed(() => {
  const counts: Record<string, number> = {};

  chs.chatHistory.forEach(msg => {
    if (msg.role === 'assistant') {
      const parsed = parseAIMessage(msg.content);
      parsed.forEach(item => {
        counts[item.emotion] = (counts[item.emotion] || 0) + 1;
      });
    }
  });

  return counts;
});

const sortedEmotions = computed(() => {
  return Object.entries(emotionCounts.value)
    .sort(([, a], [, b]) => b - a);
});

const mostFrequentEmotion = computed(() => {
  const sorted = sortedEmotions.value;
  return sorted.length > 0 ? sorted[0][0] : '无';
});

const clearDialog = ref(false);
function handleClear() {
  chs.clear();
  clearDialog.value = false;
}
</script>

<style scoped>
.chat-history-container {
  min-height: 100vh;
  background-color: #f4f5f7;
  /* 改为纯色背景 */
}

.chat-messages {
  overflow-y: auto;
  padding: 0 8px;
}

.message-row {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-bubble {
  max-width: 80%;
  word-wrap: break-word;
  transition: all 0.2s ease;
}

.message-bubble:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

.user-bubble {
  background-color: #42a5f5;
  /* 移除渐变，改为蓝色 */
  color: white;
}

.ai-bubble {
  border: 1px solid;
}

.user-avatar {
  background-color: #42a5f5;
  /* 移除渐变，与气泡颜色统一 */
}

.ai-avatar {
  border: 2px solid rgba(0, 0, 0, 0.05);
  /* 边框颜色变浅 */
}

.stats-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid #e0e0e0;
  /* 添加细边框代替阴影 */
}

.stat-item {
  padding: 16px 8px;
}

.stat-number {
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  margin-top: 4px;
  font-weight: 500;
}

.emotion-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* 响应式优化 */
@media (max-width: 600px) {
  .message-bubble {
    max-width: 90%;
  }

  .stat-item {
    padding: 12px 4px;
  }

  .stat-number {
    font-size: 1.5rem !important;
  }
}

/* 滚动条样式 */
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.5);
}

.clear-btn-bar {
  width: 100vw;
  left: 0;
  bottom: 0;
  z-index: 20;
  background: transparent;
  display: flex;
  justify-content: center;
  padding-bottom: 24px;
  pointer-events: none;
}

.clear-btn-bar .v-btn {
  pointer-events: auto;
  box-shadow: none;
  font-weight: 500;
  letter-spacing: 1px;
}
</style>