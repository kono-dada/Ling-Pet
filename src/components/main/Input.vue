<template>
  <input type="text" v-model="inputMessage" @keyup.enter="sendMessage" @keydown.enter="preventSendWhenThinking"
    :readonly="isStreaming || hasResponseItems" :placeholder="placeholder" class="chat-input"
    :class="{ 'thinking': isStreaming, 'continue': hasResponseItems && !isStreaming }" />
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import { useChatBubbleStateStore } from '../../stores/chatBubbleState';
import { useAIService } from '../../services/aiService';
import { useScreenAnalysisService } from '../../services/screenAnalysisService';
import { useStreamConversation } from '../../composables/useStreamConversation';

const cbs = useChatBubbleStateStore();
const { chatWithPetStream } = useAIService();
const { screenAnalysis } = useScreenAnalysisService();
const { startStreaming, finishStreaming, addStreamItem, isStreaming } = useStreamConversation();


const inputMessage = ref('');
const thinkingMessages = ['正在思考中', '正在思考中.', '正在思考中..', '正在思考中...'];
const thinkingIndex = ref(0);

// 检查是否有待播放的响应项
const hasResponseItems = computed(() => cbs.responseItems.length > 0);

const placeholder = computed(() => {
  if (isStreaming.value) {
    return thinkingMessages[thinkingIndex.value];
  } else if (hasResponseItems.value) {
    return '点击以继续...';
  } else {
    return '和我聊天吧...';
  }
});

async function sendMessage() {
  const userMessage = inputMessage.value.trim();
  if (userMessage && !isStreaming.value && !hasResponseItems.value) {
    // 设置发送状态
    startStreaming();
    // 立即清空输入框，这样 placeholder 就能显示
    inputMessage.value = '';
    // 启动思考动画
    const thinkingTimer = setInterval(() => {
      thinkingIndex.value = (thinkingIndex.value + 1) % thinkingMessages.length;
    }, 500);

    let screenAnalysisOn = false;
    if (userMessage.startsWith('.')) { // 使用屏幕分析
      screenAnalysisOn = true;
    }
    const screenAnalysisResponse = screenAnalysisOn ? await screenAnalysis() : '';
    const screenAnalysisBlock = `<screen-analysis>${screenAnalysisResponse}</screen-analysis>`;

    const petResponse = await chatWithPetStream(
      userMessage + (screenAnalysisOn ? screenAnalysisBlock : ''),
      addStreamItem
    );

    if (!petResponse.success) {
      cbs.setCurrentMessage(petResponse.error || '发生错误，请稍后再试。');
    }

    clearInterval(thinkingTimer);
    thinkingIndex.value = 0;

    // 无论成功还是失败，都要重置发送状态
    finishStreaming();
  }
}

function preventSendWhenThinking(event: KeyboardEvent) {
  if (isStreaming.value || hasResponseItems.value) {
    event.preventDefault();
    event.stopPropagation();
  }
}

</script>

<style scoped>
.chat-input {
  position: absolute;
  display: flex;
  bottom: 3%;
  padding: 3px 10px;
  width: 60%;
  /* align-items: center; */

  opacity: 0;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(5px);
  font-size: 12px;
  color: #333;
  outline: none;
  transition: all 0.2s ease;
  box-sizing: border-box;
  /* 防止文本选中 */
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
}

.chat-input::placeholder {
  color: rgba(100, 100, 100, 0.8);
  font-size: 11px;
}

.chat-input:focus {
  border-color: rgba(100, 150, 255, 0.8);
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 2px 8px rgba(100, 150, 255, 0.2);
  transform: scale(1.02);
}

.chat-input:hover {
  border-color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.95);
}

/* 思考和继续状态的公共样式 */
.chat-input.thinking,
.chat-input.continue,
.chat-input[readonly] {
  cursor: not-allowed;
  animation: state-breathing 2s ease-in-out infinite;
}

.chat-input.thinking::placeholder,
.chat-input.continue::placeholder,
.chat-input[readonly]::placeholder {
  font-style: italic;
  font-weight: 600;
  animation: text-breathing 2s ease-in-out infinite;
}

/* 思考状态特定样式 */
.chat-input.thinking,
.chat-input[readonly] {
  background: rgba(255, 248, 230, 0.95);
  border-color: rgba(255, 165, 0, 0.8);
  color: rgba(100, 100, 100, 0.8);
  box-shadow: 0 0 10px rgba(255, 165, 0, 0.3);
  --breathing-color: rgba(255, 165, 0, 0.6);
  --breathing-color-active: rgba(255, 165, 0, 1);
  --breathing-shadow: rgba(255, 165, 0, 0.2);
  --breathing-shadow-active: rgba(255, 165, 0, 0.5);
  --text-color: rgba(255, 140, 0, 0.9);
  --text-shadow: rgba(255, 165, 0, 0.5);
  --text-shadow-light: rgba(255, 165, 0, 0.3);
  --text-shadow-heavy: rgba(255, 165, 0, 0.7);
}

/* 继续播放状态特定样式 */
.chat-input.continue {
  background: rgba(230, 245, 255, 0.95);
  border-color: rgba(100, 150, 255, 0.8);
  color: rgba(70, 130, 180, 0.9);
  cursor: pointer;
  box-shadow: 0 0 10px rgba(100, 150, 255, 0.3);
  --breathing-color: rgba(100, 150, 255, 0.6);
  --breathing-color-active: rgba(100, 150, 255, 1);
  --breathing-shadow: rgba(100, 150, 255, 0.2);
  --breathing-shadow-active: rgba(100, 150, 255, 0.5);
  --text-color: rgba(70, 130, 180, 0.9);
  --text-shadow: rgba(100, 150, 255, 0.5);
  --text-shadow-light: rgba(100, 150, 255, 0.3);
  --text-shadow-heavy: rgba(100, 150, 255, 0.7);
}

.chat-input.thinking::placeholder,
.chat-input[readonly]::placeholder {
  color: var(--text-color);
  text-shadow: 0 0 5px var(--text-shadow);
}

.chat-input.continue::placeholder {
  color: var(--text-color);
  text-shadow: 0 0 5px var(--text-shadow);
}

/* 统一的呼吸动画效果 */
@keyframes state-breathing {
  0%,
  100% {
    opacity: 0.85;
    transform: scale(1);
    border-color: var(--breathing-color);
    box-shadow: 0 0 8px var(--breathing-shadow);
  }

  50% {
    opacity: 1;
    transform: scale(1.015);
    border-color: var(--breathing-color-active);
    box-shadow: 0 0 15px var(--breathing-shadow-active);
  }
}

/* 统一的文本呼吸动画 */
@keyframes text-breathing {
  0%,
  100% {
    opacity: 0.8;
    text-shadow: 0 0 3px var(--text-shadow-light);
  }

  50% {
    opacity: 1;
    text-shadow: 0 0 8px var(--text-shadow-heavy);
  }
}
</style>