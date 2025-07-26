import { useScreenAnalysisConfigStore } from '../stores/screenAnalysisConfig';
import type { AIMessage } from '../types/ai';
import type { ChatCompletion } from 'openai/resources';
import { fetch } from '@tauri-apps/plugin-http';
import {
  getScreenshotableMonitors,
  getMonitorScreenshot,
} from "tauri-plugin-screenshots-api";
import { readFile } from "@tauri-apps/plugin-fs";
import { BaseDirectory } from "@tauri-apps/plugin-fs";
import { debug } from '@tauri-apps/plugin-log';

export function useScreenAnalysisService() {
  const sgc = useScreenAnalysisConfigStore();

  async function callAI(messages: AIMessage[]): Promise<ChatCompletion> {
    const url = sgc.baseURL.replace(/\/+$/, '') + '/chat/completions';
    console.log('发送的消息:', messages);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${sgc.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: sgc.model,
        messages: messages,
        temperature: sgc.temperature,
        max_tokens: sgc.maxTokens,
        // enable_thinking: sgc.enableThinking,
      }),
    });

    const result = await res.json();
    console.log('AI响应:', result);
    return result as ChatCompletion;
  }
  function toBase64(array: Uint8Array): Promise<string> {
    const blob = new Blob([array]);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        // 去掉前缀 data:...base64,
        resolve(dataUrl.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function screenAnalysis(): Promise<string> {
    try {
      const monitors = await getScreenshotableMonitors();
      const path = await getMonitorScreenshot(monitors[0].id);
      debug(`获取屏幕截图路径: ${path}`);
      // 读取文件二进制
      const binary = await readFile(path, { baseDir: BaseDirectory.AppCache });
      // 将 Uint8Array 转为 base64
      const base64 = await toBase64(binary);

      // 搭配 data URI 使用
      const dataUri = `data:image/png;base64,${base64}`;
      const messages: AIMessage[] = [
        {
          role: 'system',
          content: sgc.systemPrompt
        },
        {
          role: 'user',
          content: [
            {
              "type": "image_url",
              "image_url": {
                "url": dataUri,
                "detail": sgc.imageDetail
              }
            },
          ]
        }
      ];
      const response = await callAI(messages);
      const aiMessage = response.choices[0]?.message;
      if (!aiMessage || !aiMessage.content || typeof aiMessage.content !== 'string') {
        return 'AI服务未返回有效响应';
      }
      return aiMessage.content;
    } catch (error) {
      console.error(error);
      return '';
    }
  }

  async function testScreenAnalysis(): Promise<{ success: boolean; message: string }> {
    if (!sgc.apiKey || !sgc.baseURL || !sgc.model) {
      return { success: false, message: '请正确配置屏幕分析AI服务' };
    }

    try {
      const result = await screenAnalysis();
      return { success: true, message: `屏幕分析成功: ${result}` };
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      return { success: false, message: `屏幕分析失败: ${errorMessage}` };
    }
  }

  return {
    screenAnalysis,
    testScreenAnalysis,
  };
}
