import { PetResponseItem } from "../types/ai";
import { useChatBubbleStateStore, PetResponseItemWithAudio } from "../stores/chatBubbleState";
import { usePetStateStore } from "../stores/petState";
import { useVitsConfigStore } from "../stores/vitsConfig";
import { DEFAULT_EMOTION } from "../constants/emotions";
import { voiceVits } from "./vitsService";
import { debug } from "@tauri-apps/plugin-log";

export function useStreamConversation() {
    const cbs = useChatBubbleStateStore();
    const petState = usePetStateStore();
    const vitsConfig = useVitsConfigStore();

    // 开始流式对话
    function startStreaming() {
        cbs.clear();
        cbs.setStreaming(true);
        debug('开始流式对话');
    }

    // 添加新的消息项（当AI流式返回完整item时调用）
    async function addStreamItem(item: PetResponseItem) {
        const itemWithAudio: PetResponseItemWithAudio = { ...item };
        
        // 如果启用了VITS且有日语文本，则生成语音
        if (vitsConfig.on && vitsConfig.baseURL && item.japanese) {
            try {
                debug(`正在为日语文本生成语音: ${item.japanese}`);
                const audioBlob = await voiceVits(item.japanese);
                itemWithAudio.audioBlob = audioBlob;
                debug('语音生成成功');
            } catch (error) {
                debug(`语音生成失败: ${error}`);
                console.error('VITS语音生成失败:', error);
            }
        }
        
        cbs.addItem(itemWithAudio);
        // 如果当前没有显示消息且队列中只有这一条消息，立即播放
        if (!cbs.currentMessage && cbs.responseItems.length === 1) {
            playNext();
        }
    }

    // 播放下一句话
    function playNext() {
        const nextItem = cbs.shiftNext();

        if (nextItem) {
            cbs.setCurrentMessage(nextItem.message);
            petState.setPetEmotion(nextItem.emotion);
            
            // 播放语音（如果有）
            if (nextItem.audioBlob) {
                playAudio(nextItem.audioBlob);
            }
        } else if (cbs.isStreaming) {
            // 如果还在流式接收但没有下一句，等待
            console.log('等待更多消息...');
        } else {
            cbs.setCurrentMessage('');
            petState.setPetEmotion(DEFAULT_EMOTION);
        }
    }

    // 播放音频
    function playAudio(audioBlob: Blob) {
        try {
            // 停止当前播放的音频
            if (cbs.currentAudio) {
                cbs.currentAudio.pause();
                cbs.currentAudio = null;
            }
            
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                cbs.setCurrentAudio(null);
            };
            
            audio.onerror = (error) => {
                console.error('音频播放失败:', error);
                URL.revokeObjectURL(audioUrl);
                cbs.setCurrentAudio(null);
            };
            
            cbs.setCurrentAudio(audio);
            audio.play().catch(error => {
                console.error('音频播放失败:', error);
                URL.revokeObjectURL(audioUrl);
                cbs.setCurrentAudio(null);
            });
            
            debug('开始播放语音');
        } catch (error) {
            console.error('创建音频播放器失败:', error);
        }
    }

    // 结束对话
    function finishStreaming() {
        cbs.setStreaming(false);
        debug('stream结束');
    }

    return {
        startStreaming,
        addStreamItem,
        finishStreaming,
        playNext,
        playAudio,
    };
}
