import { PetResponseItem } from "../types/ai";
import { useChatBubbleStateStore } from "../stores/chatBubbleState";
import { usePetStateStore } from "../stores/petState";
import { DEFAULT_EMOTION } from "../constants/emotions";
import { debug } from "@tauri-apps/plugin-log";

export function useStreamConversation() {
    const cbs = useChatBubbleStateStore();
    const petState = usePetStateStore();

    // 开始流式对话
    function startStreaming() {
        cbs.clear();
        cbs.setStreaming(true);
        debug('开始流式对话');
    }

    // 添加新的消息项（当AI流式返回完整item时调用）
    function addStreamItem(item: PetResponseItem) {
        cbs.addItem(item);
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
        } else if (cbs.isStreaming) {
            // 如果还在流式接收但没有下一句，等待
            console.log('等待更多消息...');
        } else {
            cbs.setCurrentMessage('');
            petState.setPetEmotion(DEFAULT_EMOTION);
        }
    }

    // 结束对话
    function finishStreaming() {
        cbs.setStreaming(false);
        debug('对话结束');
    }

    return {
        startStreaming,
        addStreamItem,
        finishStreaming,
        playNext,
    };
}
