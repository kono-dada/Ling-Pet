<template>
  <input type="text" v-model="inputMessage" @keyup.enter="sendMessage" @keydown.enter="preventSendWhenThinking"
    :readonly="currentConfig.readonly" :placeholder="placeholder" class="chat-input"
    :class="currentConfig.cssClass" />
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { useChatBubbleStateStore } from '../../stores/chatBubbleState';
import { describeScreens } from '../../services/screenAnalysis/screenDescription';
import { useStreamConversation } from '../../composables/useStreamConversation';
import { chatWithPetStream } from '../../services/chatAndVoice/chatWithPet';

const cbs = useChatBubbleStateStore();
const { startStreaming, finishStreaming, addStreamItem, isStreaming } = useStreamConversation();


const inputMessage = ref('');
const thinkingMessages = ['正在思考中', '正在思考中.', '正在思考中..', '正在思考中...'];
const thinkingIndex = ref(0);

// 输入框状态枚举
enum InputState {
  IDLE = 'idle',
  THINKING = 'thinking',
  CONTINUE = 'continue',
  // 预留未来状态示例：
  // WAITING = 'waiting',      // 等待外部条件
  // DISABLED = 'disabled',    // 禁用状态
  // ERROR = 'error',          // 错误状态
  // RECORDING = 'recording'   // 语音录制状态
}

// 状态配置
const stateConfig = {
  [InputState.IDLE]: {
    placeholder: '和我聊天吧...',
    readonly: false,
    cssClass: '',
    cursor: 'text'
  },
  [InputState.THINKING]: {
    placeholder: () => thinkingMessages[thinkingIndex.value],
    readonly: true,
    cssClass: 'thinking',
    cursor: 'not-allowed'
  },
  [InputState.CONTINUE]: {
    placeholder: '点击以继续...',
    readonly: true,
    cssClass: 'continue',
    cursor: 'pointer'
  }
  // 未来添加新状态的示例：
  // [InputState.WAITING]: {
  //   placeholder: '请稍等...',
  //   readonly: true,
  //   cssClass: 'waiting',
  //   cursor: 'wait'
  // }
};

// 状态计算逻辑
const currentState = computed(() => {
  if (isStreaming.value) return InputState.THINKING;
  if (cbs.responseItems.length > 0) return InputState.CONTINUE;
  return InputState.IDLE;
});

// 当前状态配置
const currentConfig = computed(() => stateConfig[currentState.value]);

// 动态 placeholder
const placeholder = computed(() => {
  const config = currentConfig.value;
  return typeof config.placeholder === 'function' 
    ? config.placeholder() 
    : config.placeholder;
});

// 状态变化监听器（为未来扩展预留）
watch(currentState, (newState: InputState, oldState: InputState) => {
  // 可以在这里添加状态变化时的副作用
  // 例如：播放声音、发送事件、记录日志等
  if (newState === InputState.THINKING && oldState === InputState.IDLE) {
    // 开始思考时的处理
  }
  if (newState === InputState.CONTINUE && oldState === InputState.THINKING) {
    // 从思考转为继续状态的处理
  }
  if (newState === InputState.IDLE) {
    // 返回空闲状态的处理
  }
}, { immediate: false });

async function sendMessage() {
  const userMessage = inputMessage.value.trim();
  if (userMessage && currentState.value === InputState.IDLE) {
    // 设置发送状态
    startStreaming();
    // 立即清空输入框，这样 placeholder 就能显示
    inputMessage.value = '';
    // 启动思考动画
    const thinkingTimer = setInterval(() => {
      thinkingIndex.value = (thinkingIndex.value + 1) % thinkingMessages.length;
    }, 500);

    const screenAnalysisResponse = userMessage.startsWith('.') ? await describeScreens() : '';
    const screenAnalysisBlock = `<screen-analysis>${screenAnalysisResponse}</screen-analysis>`;

    const petResponse = await chatWithPetStream(
      userMessage + (userMessage.startsWith('.') ? screenAnalysisBlock : ''),
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
  if (currentState.value !== InputState.IDLE) {
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