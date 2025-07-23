<template>
  <input type="text" v-model="inputMessage" @keyup.enter="sendMessage" @keydown.enter="preventSendWhenThinking"
    :readonly="isSending" :placeholder="placeholder" class="chat-input" :class="{ 'thinking': isSending }" />
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import { useChatBubbleStateStore } from '../../stores/chatBubbleState';
import { useConversation } from '../../services/useConversation';
import { useAIService } from '../../services/aiService';

const cbs = useChatBubbleStateStore();
const { startConversation } = useConversation();
const { chatWithPet } = useAIService();

const inputMessage = ref('');
const isSending = ref(false);
const thinkingMessages = ['正在思考中', '正在思考中.', '正在思考中..', '正在思考中...'];
const thinkingIndex = ref(0);
const placeholder = computed(() => {
  return isSending.value ? thinkingMessages[thinkingIndex.value] : '和我聊天吧...';
});

async function sendMessage() {
  const userMessage = inputMessage.value.trim();
  if (userMessage && !isSending.value) {
    if (userMessage.startsWith('/')) { // 测试气泡样式用的后门
      // 如果是命令，直接处理
      cbs.setCurrentMessage(`执行命令: ${userMessage}`);
      inputMessage.value = '';
      return;
    }

    // 立即清空输入框，这样 placeholder 就能显示
    inputMessage.value = '';

    // 设置发送状态
    isSending.value = true;


    // 启动思考动画
    const thinkingTimer = setInterval(() => {
      thinkingIndex.value = (thinkingIndex.value + 1) % thinkingMessages.length;
    }, 500);

    const petResponse = await chatWithPet(userMessage);

    if (petResponse.success) {
      // 如果有宠物响应，开始对话
      await startConversation(petResponse.data ? petResponse.data : []);
    } else {
      cbs.setCurrentMessage(petResponse.error || '发生错误，请稍后再试。');
    }

    clearInterval(thinkingTimer);
    thinkingIndex.value = 0;

    // 无论成功还是失败，都要重置发送状态
    isSending.value = false;
  }
}

function preventSendWhenThinking(event: KeyboardEvent) {
  if (isSending.value) {
    event.preventDefault();
    event.stopPropagation();
  }
}
</script>

<style scoped>
.chat-input {
  position: absolute;
  display: flex;
  bottom: 0;
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

/* 思考状态样式 */
.chat-input.thinking,
.chat-input[readonly] {
  background: rgba(255, 248, 230, 0.95);
  border-color: rgba(255, 165, 0, 0.8);
  color: rgba(100, 100, 100, 0.8);
  cursor: not-allowed;
  animation: thinking-breathing 2s ease-in-out infinite;
  box-shadow: 0 0 10px rgba(255, 165, 0, 0.3);
}

.chat-input.thinking::placeholder,
.chat-input[readonly]::placeholder {
  color: rgba(255, 140, 0, 0.9);
  font-style: italic;
  font-weight: 600;
  text-shadow: 0 0 5px rgba(255, 165, 0, 0.5);
  animation: text-breathing 2s ease-in-out infinite;
}

/* 呼吸动画效果 */
@keyframes thinking-breathing {

  0%,
  100% {
    opacity: 0.85;
    transform: scale(1);
    border-color: rgba(255, 165, 0, 0.6);
    box-shadow: 0 0 8px rgba(255, 165, 0, 0.2);
  }

  50% {
    opacity: 1;
    transform: scale(1.015);
    border-color: rgba(255, 165, 0, 1);
    box-shadow: 0 0 15px rgba(255, 165, 0, 0.5);
  }
}

/* 文本呼吸动画 */
@keyframes text-breathing {

  0%,
  100% {
    opacity: 0.8;
    text-shadow: 0 0 3px rgba(255, 165, 0, 0.3);
  }

  50% {
    opacity: 1;
    text-shadow: 0 0 8px rgba(255, 165, 0, 0.7);
  }
}
</style>