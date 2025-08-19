import { AIMessage } from "../../types/ai"
import { CHAT_SCENARIO_PROMPT, getResponseFormatPromptForChat } from "./prompts/promptsForChat";
import { getResponseFormatPromptForSchedule } from "./prompts/promptsForSchedule";
import { useAIConfigStore } from "../../stores/aiConfig";
import { getHypothesesPrompt, getMemoryPrompt, getScreenshotsPrompt } from "./prompts/general";
import { useChatHistoryStore } from "../../stores/chatHistory";
import { SCHEDULE_SCENARIO_PROMPT } from "./prompts/promptsForSchedule";
import { SCHEDULE_USER_MESSAGE_WRAPPER } from "./prompts/promptsForSchedule";

export async function constructMessageForChat(userMessage: string): Promise<AIMessage[]> {
  const acs = useAIConfigStore()
  const chs = useChatHistoryStore()
  const messages: AIMessage[] = [];

  const systemPrompt = CHAT_SCENARIO_PROMPT + getResponseFormatPromptForChat() + acs.systemPrompt + getMemoryPrompt() + getHypothesesPrompt() + await getScreenshotsPrompt();

  messages.push({role: 'system', content: systemPrompt})

  const historyLength = Math.min(chs.chatHistory.length, acs.historyMaxLength);
  for (let i = chs.chatHistory.length - historyLength; i < chs.chatHistory.length; i++) {
    const message = chs.chatHistory[i];
    if (message.role === 'user' || message.role === 'assistant' || message.role === 'tool') {
      messages.push(message);
    }
  }

  messages.push({
    role: 'user',
    content: userMessage,
  });
  
  return messages
}

export async function constructMessageForSchedule(scheduleMessage: string): Promise<AIMessage[]> {
  const acs = useAIConfigStore()
  const messages: AIMessage[] = [];

  const systemPrompt = SCHEDULE_SCENARIO_PROMPT + getResponseFormatPromptForSchedule() + acs.systemPrompt + getMemoryPrompt() + getHypothesesPrompt() + await getScreenshotsPrompt();


  messages.push({role: 'system', content: systemPrompt})

  messages.push({
    role: 'user',
    content: SCHEDULE_USER_MESSAGE_WRAPPER.replace("{}", scheduleMessage),
  });

  return messages
}