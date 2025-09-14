<template>
  <div class="live2d-wrapper">
    <!-- Thinking bubble in top-left when streaming -->
    <div v-if="isStreaming" class="thinking-bubble" :style="thinkingBubbleStyle" aria-label="thinking">
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </div>

    <div class="live2d-container" :class="borderClass" ref="live2dContainer">
      <canvas ref="live2dCanvas" class="live2d-canvas" @mousedown="onDragStart" @click.stop="onClick"></canvas>
    </div>
    
    <div v-if="!isReady" class="avatar-loading" :class="borderClass">Live2D加载中……</div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import * as PIXI from 'pixi.js';
// 仅引入 Cubism 3/4 的实现，避免 v2 运行时强制校验
import { Live2DModel } from 'pixi-live2d-display/cubism4';
import { usePetStateStore } from '../../stores/petState';
import { useConversationStore } from '../../stores/conversation';
import { storeToRefs } from 'pinia';
import { registerAvatarClick } from '../../services/interactions/avatarMultiClickEmitter';
import { useAppearanceConfigStore } from '../../stores/configs/appearanceConfig';
import { useMemoryStore } from '../../stores/memory';

const state = usePetStateStore();
const appWindow = getCurrentWebviewWindow();
const conversation = useConversationStore();
const { isStreaming } = storeToRefs(conversation);
const ac = useAppearanceConfigStore();

const live2dContainer = ref<HTMLDivElement>();
const live2dCanvas = ref<HTMLCanvasElement>();
const isReady = ref(false);

// 计算边界类名
const borderClass = computed(() => {
  return ac.live2dBorderType === 'circle' ? 'circle-border' : 'no-border';
});

// 计算thinking-bubble的样式（恢复为原始状态）
const thinkingBubbleStyle = computed(() => {
  // 确保元素可见的默认样式
  const defaultStyle = {
    position: 'absolute' as const,
    top: '10%',
    left: '10%',
    width: '30%',
    height: '18%',
    zIndex: '2',
  };

  // 如果不在流式状态，不显示thinking-bubble
  if (!isStreaming.value) {
    return {
      display: 'none'
    };
  }

  // 在流式状态下，保持默认的左上角位置
  return defaultStyle;
});

// 暴露 PIXI 到 window，方便 live2d 插件拿到 Ticker
(window as any).PIXI = PIXI;

let pixiApp: PIXI.Application | null = null;
let live2dModel: Live2DModel | null = null;

/**
 * 加载本地脚本
 * @param src 脚本路径
 * @returns Promise
 */
function loadLocalScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`failed to load: ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * 确保加载 Cubism 4 核心运行时
 */
async function ensureCubismCore() {
  const w = window as unknown as { Live2DCubismCore?: unknown };
  if (w.Live2DCubismCore) return;
  await loadLocalScript('/live2d-core/live2dcubismcore.min.js');
}

/**
 * 确保加载 Cubism 2 运行时
 */
async function ensureCubism2() {
  const w = window as unknown as { Live2D?: unknown };
  if ((w as any).Live2D) return;
  await loadLocalScript('/live2d-core/live2d.min.js');
}

/**
 * 根据模型文件自动选择需要的运行时
 * @param modelPath 模型路径
 */
async function ensureLive2DRuntimeForModel(modelPath: string) {
  const lower = modelPath.toLowerCase();
  if (lower.endsWith('.model3.json') || lower.endsWith('.moc3')) {
    await ensureCubismCore();
  } else if (lower.endsWith('.model.json') || lower.endsWith('.moc')) {
    await ensureCubism2();
  } else {
    // 默认按 v3/4 处理
    await ensureCubismCore();
  }
}

// Live2D模型路径配置
const modelConfig = {
  // UGOfficial模型的主配置文件
  modelPath: '/live2d/Xuehu_Q版/model.json',
};

/**
 * 初始化Live2D模型
 */
async function initLive2D() {
  if (!live2dContainer.value || !live2dCanvas.value) return;
  
  try {
    // 在加载模型前根据模型类型加载对应运行时（仅本地）
    await ensureLive2DRuntimeForModel(modelConfig.modelPath);

    // 获取实际的容器尺寸
    const containerRect = live2dContainer.value.getBoundingClientRect();
    const canvasWidth = containerRect.width || 300;
    const canvasHeight = containerRect.height || 300;

    // 创建 PIXI 应用：兼容 v7 / v8 两种初始化方式
    const isV8 = 'init' in (PIXI.Application.prototype as any);
    if (isV8) {
      pixiApp = new PIXI.Application() as any;
      await (pixiApp as any).init({
        canvas: live2dCanvas.value,
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: 0x000000,
        backgroundAlpha: 0, // 透明背景
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
    } else {
      pixiApp = new (PIXI.Application as any)({
        view: live2dCanvas.value,
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: 0x000000,
        backgroundAlpha: 0, // 透明背景
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
    }

    // 加载Live2D模型（禁用内置交互以兼容 Pixi v7/v8 差异）
    live2dModel = await Live2DModel.from(modelConfig.modelPath, {
      autoInteract: false,
    });
    
    if (live2dModel) {
      if (!pixiApp) throw new Error('PIXI Application not initialized');
      // 设置模型缩放和位置
      updateModelScaleAndPosition();
      
      // 添加到舞台
      pixiApp.stage.addChild(live2dModel as any);
      
      // 启用交互（使用类型断言解决兼容性问题）
      (live2dModel as any).eventMode = 'static';
      (live2dModel as any).cursor = 'pointer';
      
      // 设置默认动画
      playMotion('loop');
      
      console.log('Live2D模型已加载并居中:', { 
        modelX: live2dModel.x, 
        modelY: live2dModel.y, 
        screenWidth: pixiApp.screen.width, 
        screenHeight: pixiApp.screen.height,
        containerRect: live2dContainer.value?.getBoundingClientRect()
      });
      
      isReady.value = true;
    }
  } catch (error) {
    console.error('Live2D初始化失败:', error);
    isReady.value = false;
  }
}

/**
 * 更新模型缩放和位置
 */
function updateModelScaleAndPosition() {
  if (!live2dModel || !pixiApp) return;
  
  // 计算基于宠物大小的缩放比例
  // 基础缩放比例基于宠物大小与默认大小(200px)的比例关系
  const sizeScale = ac.petSize / 200; // 200px是默认宠物大小
  const scale = sizeScale * ac.live2dModelScale;
  
  live2dModel.scale.set(scale);
  
  // 使用配置中的位置
  const centerX = pixiApp.screen.width * ac.live2dModelPositionX;
  const centerY = pixiApp.screen.height * ac.live2dModelPositionY;
  
  live2dModel.x = centerX;
  live2dModel.y = centerY;
  live2dModel.anchor.set(0.5, 0.5);
  
  console.log('模型缩放和位置已更新:', { 
    scale: scale,
    modelX: live2dModel.x, 
    modelY: live2dModel.y,
    screenWidth: pixiApp.screen.width, 
    screenHeight: pixiApp.screen.height
  });
}

/**
 * 播放动作
 * @param motionName 动作名称
 */
function playMotion(motionName: string) {
  if (!live2dModel) return;
  
  try {
    // 播放指定动作
    live2dModel.motion(motionName);
  } catch (error) {
    console.warn('动作播放失败:', motionName, error);
    // 回退到默认动作
    live2dModel.motion('loop');
  }
}

/**
 * 播放表情
 * @param expressionName 表情名称
 */
function playExpression(expressionName: string) {
  if (!live2dModel) return;
  
  try {
    // 播放指定表情
    live2dModel.expression(expressionName);
  } catch (error) {
    console.warn('表情播放失败:', expressionName, error);
    // 尝试作为动作播放
    try {
      live2dModel.motion(expressionName);
    } catch (motionError) {
      console.warn('作为动作播放也失败:', expressionName, motionError);
    }
  }
}

/**
 * 根据表情编号播放表情
 * @param emotionCode 表情编号
 */
function playExpressionByEmotion(emotionCode: number) {
  const expressionName = emotionToExpression[emotionCode] || 'loop';
  playExpression(expressionName);
}

// 表情映射：将你现有的emotion code映射到Live2D表情和动作
// 基于UGOfficial模型的表情文件名映射
const emotionToExpression: Record<number, string> = {
  0: 'loop', // 默认循环动作
  1: '1desk', // 桌面/工作状态
  2: '5QAQ', // 伤心
  3: '8punch', // 生气/打击
  4: '4OAO', // 惊讶
  5: '9', // 眨眼等
  6: '3clever', // 聪明/点头
  7: '7keyboard', // 摇头/键盘
  8: '1desk', // 开心/工作
  9: '5QAQ', // 哭泣
  10: '3clever', // 微笑/聪明
  11: '4OAO', // 眨眼
  12: '6i gi a ri', // 亲吻/特殊表情
  13: '2mic', // 爱心/麦克风
  14: '1desk', // 睡觉/桌面
  15: '3clever', // 思考/聪明
  16: '4OAO', // 疑问/惊讶
  17: '2mic', // 打招呼/麦克风
  18: '1desk' // 再见/桌面
  // 根据UGOfficial模型的实际表情文件调整
};

/**
 * 拖拽开始处理
 */
function onDragStart(e: MouseEvent) {
  // 仅在按下主键时启用拖拽判定
  if ((e.buttons & 1) === 0) return;

  const startX = e.clientX;
  const startY = e.clientY;
  let started = false;

  const DRAG_THRESHOLD = 5; // 像素，避免点击触发拖拽

  const onMove = (ev: MouseEvent) => {
    if (started) return;
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
      started = true;
      void appWindow.startDragging();
      cleanup();
    }
  };

  const onUp = () => cleanup();

  function cleanup() {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  }

  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp, { once: true });
}

/**
 * 点击事件处理
 */
function onClick() {
  // 取消可能存在的自动播放定时器
  conversation.cancelAutoPlay();
  
  state.updateLastClickTimestamp();
  conversation.playNext();
  registerAvatarClick();
  
  // 播放点击动作
  playMotion('tap_body');
}

/**
 * 调整Canvas大小
 */
function resizeCanvas() {
  if (!pixiApp || !live2dContainer.value) return;
  
  const containerRect = live2dContainer.value.getBoundingClientRect();
  pixiApp.renderer.resize(containerRect.width, containerRect.height);
  
  // 更新模型缩放和位置
  updateModelScaleAndPosition();
  
  console.log('Canvas已重新调整大小，模型重新居中:', { 
    containerWidth: containerRect.width, 
    containerHeight: containerRect.height
  });
}

// 监听表情变化
watch(() => state.currentEmotion, (newEmotion) => {
  playExpressionByEmotion(newEmotion);
});

// 监听容器大小变化
watch(() => ac.petSize, () => {
  nextTick(() => {
    resizeCanvas();
  });
});

// 监听Live2D模型设置变化
watch(() => [ac.live2dModelScale, ac.live2dModelPositionX, ac.live2dModelPositionY], () => {
  nextTick(() => {
    updateModelScaleAndPosition();
  });
});

// 监听边界类型变化
watch(() => ac.live2dBorderType, () => {
  nextTick(() => {
    resizeCanvas();
  });
});

onMounted(async () => {
  await nextTick();
  
  // 确保容器已经有正确的尺寸，延迟一点时间
  setTimeout(async () => {
    await initLive2D();
    
    // 初始化完成后再次确保居中
    setTimeout(() => {
      resizeCanvas();
    }, 100);
  }, 50);
  
  // 添加窗口大小监听
  window.addEventListener('resize', resizeCanvas);
  
  // 初始化对话内容（保持原有逻辑）
  setTimeout(() => {
    if (useMemoryStore().firstLaunch) {
      [
        {
          message: '你好呀，初次见面~',
          emotion: 10,
          japanese: 'こんにちは〜',
        },
        {
          message: '我叫钦灵，从今天开始我就住在你的电脑里了……',
          emotion: 17,
          japanese: '私はりんと申します。今日からあなたのパートナーになります。',
        },
        {
          message: '你可以叫我灵灵',
          emotion: 8,
          japanese: 'りんりんと呼んでください。',
        },
        {
          message: '你呢？如果能告诉我你的名字的话，我会很开心的~',
          emotion: 10,
          japanese: '差し支えなければ、あなたのお名前を教えていただけますか？',
        }
      ].forEach(item => {
        conversation.addItem(item);
      });
    }
    useMemoryStore().firstLaunch = false;
  }, 2000);
  
  setTimeout(() => {
    conversation.cancelInactivityWatch();
  }, 6000);
});

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas);
  if (pixiApp) {
    pixiApp.destroy(true, true);
  }
});
</script>

<style scoped>
.live2d-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  --glow-color: 80 180 255;
}

.live2d-container {
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  background: transparent;
}

.live2d-container.circle-border {
  border-radius: 50%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
}

.live2d-container.circle-border:hover {
  transform: scale(1.05);
  transform-origin: center center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}

.live2d-container.no-border {
  border-radius: 0;
  box-shadow: none;
}

.live2d-container.no-border:hover {
  transform: scale(1.05);
  transform-origin: center center;
}

.live2d-canvas {
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.live2d-container.circle-border .live2d-canvas {
  border-radius: 50%;
}

.avatar-loading {
  width: 100%;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  user-select: none;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
}

.avatar-loading.circle-border {
  border-radius: 50%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
}

.avatar-loading.no-border {
  border-radius: 0;
  box-shadow: none;
}

/* Thinking bubble - scales with parent */
.thinking-bubble {
  position: absolute;
  top: 10%;
  left: 10%;
  width: 30%;
  height: 18%;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(4px);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10%;
  z-index: 2;
  pointer-events: none;
  /* do not block clicks */
}

.thinking-bubble .dot {
  width: 12%;
  height: 26%;
  border-radius: 50%;
  background: black;
  opacity: 0.35;
  animation: bubblePulse 1.2s infinite ease-in-out;
}

.thinking-bubble .dot:nth-child(2) {
  animation-delay: 0.15s;
}

.thinking-bubble .dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes bubblePulse {
  0% {
    opacity: 0.25;
    transform: translateY(0) scale(0.9);
  }

  30% {
    opacity: 1;
    transform: translateY(-6%) scale(1.05);
  }

  60% {
    opacity: 0.6;
    transform: translateY(0) scale(0.95);
  }

  100% {
    opacity: 0.25;
    transform: translateY(0) scale(0.9);
  }
}
</style>