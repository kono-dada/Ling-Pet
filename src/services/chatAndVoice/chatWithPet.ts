import { AIMessage } from "../../types/ai";
import { useAIConfigStore } from "../../stores/aiConfig";
import { useChatHistoryStore } from "../../stores/chatHistory";
import { useConversationStore } from "../../stores/conversation";
import { constructMessageForChat } from "../llm/messageConstructor";
import { invokeLLM } from "../llm/invokeLLM";

export async function chatWithPetStream(
  userMessage: string,
): Promise<{ success: boolean; error?: string }> {
  // Lazily access stores here to ensure Pinia is active
  const ac = useAIConfigStore();
  const chs = useChatHistoryStore();
  const conversation = useConversationStore();

  // 检查配置是否完整
  const hasConfig = Boolean(ac.apiKey && ac.baseURL && ac.model)
  if (!hasConfig) {
    return {
      success: false,
      error: '请正确配置AI服务'
    };
  }

  const messages: AIMessage[] = constructMessageForChat(userMessage);

  // 添加 user 消息到聊天历史（默认开启）
  chs.addMessage({
    role: 'user',
    content: userMessage
  });

  const resultMessages = await invokeLLM({ 
    messages, 
    onItem: conversation.addItem 
  });

  console.log('AI回复：', resultMessages);

  resultMessages.map(msg => {
    chs.addMessage(msg);
  });

  chs.$tauri.save();

  return { success: true };
}
