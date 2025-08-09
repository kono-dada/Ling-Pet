import { useScreenAnalysisConfigStore } from '../stores/screenAnalysisConfig';
import type { AIMessage } from '../types/ai';
import type { ChatCompletion } from 'openai/resources';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import {
  getScreenshotableWindows,
  getWindowScreenshot,
  clearScreenshots
} from "tauri-plugin-screenshots-api";
import { readFile } from "@tauri-apps/plugin-fs";
import { BaseDirectory } from "@tauri-apps/plugin-fs";
import { debug } from '@tauri-apps/plugin-log';
import { OpenAI } from 'openai';

async function resizeImage(base64: string, targetHeight: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      const targetWidth = targetHeight * aspectRatio;
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas 2D context'));
        return;
      }
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      const resizedBase64 = canvas.toDataURL('image/png');
      resolve(resizedBase64);
    };
    img.onerror = () => {
      reject(new Error('Failed to load image for resizing'));
    };
    img.src = base64;
  });
}

export function useScreenAnalysisService() {
  const sgc = useScreenAnalysisConfigStore();

  async function callAI(messages: AIMessage[]): Promise<ChatCompletion> {
    const client = new OpenAI({
      apiKey: sgc.apiKey,
      baseURL: sgc.baseURL,
      fetch: tauriFetch, // 使用 Tauri 的 fetch，防止CORS问题
      dangerouslyAllowBrowser: true, // 允许浏览器环境
    });

    console.log('调用AI服务，消息:', messages);
    const completion = await client.chat.completions.create({
      model: sgc.model,
      messages: messages,
      temperature: sgc.temperature,
      max_tokens: sgc.maxTokens,
    });
    console.log('AI服务响应:', completion);

    return completion;
  }

  function toBase64(array: Uint8Array): Promise<string> {
    // 复制成使用 ArrayBuffer 的视图，避免 SharedArrayBuffer 类型不匹配
    const bytes = new Uint8Array(array);
    const blob = new Blob([bytes.buffer]);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function screenAnalysis(): Promise<string> {
    const windows = await getScreenshotableWindows();
    const usedWindowIds: number[] = [];
    const uriList: (string|null)[] = await Promise.all(
      windows.map(async (win) => {
        const start = Date.now();
        const path = await getWindowScreenshot(win.id);
        const duration = Date.now() - start;
        debug(`getWindowScreenshot 用时: ${duration}ms`);
        debug(`获取窗口截图路径: ${path}`);
        const binary = await readFile(path, { baseDir: BaseDirectory.AppCache });
        const tempBase64 = await toBase64(binary);
        const tempDataUri = `data:image/png;base64,${tempBase64}`;

        // 获取图片尺寸
        const img = new Image();
        img.src = tempDataUri;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        const w = img.width;
        const h = img.height;
        const pixelCount = w * h;
        const aspectRatio = w / h;
        const aspectRatioInv = h / w;

        // 过滤条件
        if (
          pixelCount < 40000 ||
          aspectRatio > 10 ||
          aspectRatioInv > 10
        ) {
          debug(`过滤掉窗口截图: id=${win.id}, 尺寸=${w}x${h}, 像素=${pixelCount}, 宽高比=${aspectRatio}`);
          return null;
        }

        usedWindowIds.push(win.id);
        const resizedDataUri = await resizeImage(tempDataUri, 480);
        return resizedDataUri;
      })
    );
    // 过滤掉 null
    const filteredUriList = uriList.filter((uri): uri is string => !!uri);
    clearScreenshots()

    debug(`最终实际使用到的窗口截图id: ${JSON.stringify(usedWindowIds)}`);

    // 将 uriList 中的每个 dataUri 作为 content 的一个元素
    const messages: AIMessage[] = [
      {
      role: 'system',
      content: sgc.systemPrompt
      },
      {
      role: 'user',
      content: filteredUriList.map((dataUri) => ({
        type: "image_url",
        image_url: {
        url: dataUri,
        detail: sgc.imageDetail
        }
      }))
      }
    ];
    const response = await callAI(messages);
    const aiMessage = response.choices[0]?.message;
    if (!aiMessage || !aiMessage.content || typeof aiMessage.content !== 'string') {
      return 'AI服务未返回有效响应';
    }
    return aiMessage.content;
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
