import { useAIConfigStore } from '../stores/aiConfig';
import { computed } from 'vue';
import type { AIResponse, ChatRequest, AIMessage, PetResponse, PetResponseItem } from '../types/ai';
import { DEFAULT_CHARACTER_PROMPT, RESPONSE_FORMAT_PROMPT, USER_PROMPT_WRAPPER } from '../constants/ai';
import { EMOTIONS } from '../constants/emotions';
import { EmotionName } from '../types/emotion';
import { error } from '@tauri-apps/plugin-log';

export function useAIService() {
    const ais = useAIConfigStore();
    const validateAIConfig = computed(() => Boolean(ais.apiKey && ais.baseURL && ais.model));

    async function callAI(messages: AIMessage[]): Promise<AIResponse> {

        const requestBody: ChatRequest = {
            messages,
            temperature: ais.temperature,
            max_tokens: ais.maxTokens,
            stream: false,
        };

        const response = await fetch(`${ais.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ais.apiKey}`,
            },
            body: JSON.stringify({
                model: ais.model,
                ...requestBody,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            error(`AI API 调用失败: ${response.status} ${response.statusText}\n${errorText}`);
        }

        return await response.json() as AIResponse;
    }

    async function chatWithPet(userMessage: string): Promise<PetResponse> {
        // 检查配置是否完整
        if (!validateAIConfig.value) {
            return {
                success: false,
                error: '请正确配置AI服务'
            };
        }

        try {
            const messages: AIMessage[] = [];
            // 添加系统提示词和响应格式要求
            if (ais.systemPrompt) {
                messages.push({
                    role: 'system',
                    content: ais.systemPrompt + '\n\n' + RESPONSE_FORMAT_PROMPT
                });
            }
            messages.push({
                role: 'user',
                content: USER_PROMPT_WRAPPER.replace('{}', userMessage)
            });
            console.log('发送的消息:', messages);
            const response = await callAI(messages);
            console.log('AI响应:', response);
            const aiResponseContent = response.choices[0]?.message?.content;

            if (!aiResponseContent) {
                console.error('AI服务返回空响应');
                return { success: false, error: 'AI服务返回空响应' };
            }

            // 解析JSON并转换为PetResponseItem[]
            try {
                const parsedResponse = JSON.parse(aiResponseContent);
                console.log('parsed AI响应:', parsedResponse);

                // 验证并转换为PetResponseItem
                if (Array.isArray(parsedResponse)) {
                    const validItems: PetResponseItem[] = parsedResponse.filter(item =>
                        typeof item === 'object' &&
                        typeof item.message === 'string' &&
                        typeof item.emotion === 'string' &&
                        typeof item.japanese === 'string' &&
                        EMOTIONS.includes(item.emotion as EmotionName)
                    ).map(item => ({
                        message: item.message,
                        emotion: item.emotion as EmotionName,
                        japanese: item.japanese
                    }));

                    return validItems.length > 0
                        ? { success: true, data: validItems }
                        : { success: false };
                }

                return { success: false };
            } catch (error) {
                console.error('AI响应解析失败:', error);
                return { success: false };
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            return {
                success: false,
                error: `对话失败: ${errorMessage}`
            };
        }
    }

    async function testAIConnection(): Promise<{ success: boolean; message: string }> {
        if (!validateAIConfig.value) {
            return { success: false, message: '请正确配置AI服务' };
        }

        try {
            const response = await callAI([
                { role: 'system', content: DEFAULT_CHARACTER_PROMPT },
                { role: 'user', content: '你好' }
            ]);
            if (!response || !response.choices || response.choices.length === 0) {
                return { success: false, message: 'AI服务未返回有效响应' };
            }
            return { success: true, message: '连接成功，AI响应正常' };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            return { success: false, message: `连接失败: ${errorMessage}` };
        }
    }

    return {
        validateAIConfig,
        callAI,
        chatWithPet,
        testAIConnection
    };
}
