import { PetResponseItem } from "../types/ai";
import { useChatBubbleStateStore } from "../stores/chatBubbleState";
import { usePetStateStore } from "../stores/petState";
import { DEFAULT_EMOTION } from "../constants/emotions";
import { debug } from "@tauri-apps/plugin-log";

export function useConversation() {
    const cbs = useChatBubbleStateStore();
    const petState = usePetStateStore();

    // 开始对话
    async function startConversation(receivedItems: PetResponseItem[]) {
        cbs.setItems(receivedItems);
        playNext();
    }

    // 播放下一句话
    function playNext() {
        if (cbs.responseItems.length === 0) {
            endConversation();
            return;
        }

        const nextMessage = cbs.shiftNext();
        if (nextMessage) {
            cbs.setCurrentMessage(nextMessage.message);
            petState.setPetEmotion(nextMessage.emotion);
            console.log(`播放下一句话: ${nextMessage.message}`);
        }
    }

    // 结束对话
    function endConversation() {
        cbs.setCurrentMessage('');
        petState.setPetEmotion(DEFAULT_EMOTION); // 重置为中性情绪
        cbs.clear();
        debug('对话结束');
    }

    return {
        startConversation,
        playNext,
        endConversation,
        currentMessage: cbs.currentMessage,
        currentEmotion: petState.currentEmotion,
    };
}
