import { useScreenAnalysisConfigStore } from '../../stores/screenAnalysisConfig';
import type { AIMessage } from '../../types/ai';
import type { ChatCompletion } from 'openai/resources';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import {
  getScreenshotableWindows as rawGetScreenshotableWindows,
  getWindowScreenshot,
  clearScreenshots
} from "tauri-plugin-screenshots-api";
import { readFile } from "@tauri-apps/plugin-fs";
import { BaseDirectory } from "@tauri-apps/plugin-fs";
import { debug } from '@tauri-apps/plugin-log';
import { OpenAI } from 'openai';
import { ScreenshotableWindow } from 'tauri-plugin-screenshots-api';


const ignoreList = ['控制中心', '通知中心', 'Window Server', '搜狗输入法', 'lingpet', '程序坞'];

// 由于macOS可能会有一些状态栏图标之类的被当成窗口，在这里过滤掉。lingpet自己也过滤掉。
export async function getScreenshotableWindows(): Promise<ScreenshotableWindow[]> {
  const list = await rawGetScreenshotableWindows()
  return list.filter(w => {
    const app = w.appName ?? ''
    const name = (w as any).name ?? ''
    const title = (w as any).title ?? ''
    // 任何一个字段命中忽略列表即过滤
    return !ignoreList.some(ig => app.includes(ig) || name.includes(ig) || title.includes(ig))
  })
}

// 调整到480p再上传给LLM
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


async function callAI(messages: AIMessage[]): Promise<ChatCompletion> {
  const sgc = useScreenAnalysisConfigStore();
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

// 使用视觉语言模型，获取多个窗口的描述
export async function describeScreens(windowIds: number[] | null = null): Promise<string> {
  const sgc = useScreenAnalysisConfigStore();
  try {
    if (!windowIds) {
      windowIds = (await getScreenshotableWindows()).map(win => win.id);
    }
    const usedWindowIds: number[] = [];
    // 截图时异步并发截图
    const uriList: string[] = await Promise.all(
      windowIds.map(async (id) => {
        const start = Date.now();
        const path = await getWindowScreenshot(id);
        const duration = Date.now() - start;
        debug(`getWindowScreenshot 用时: ${duration}ms`);
        debug(`获取窗口截图路径: ${path}`);
        const binary = await readFile(path, { baseDir: BaseDirectory.AppCache });
        const tempBase64 = await toBase64(binary);
        const tempDataUri = `data:image/png;base64,${tempBase64}`;

        usedWindowIds.push(id);
        const resizedDataUri = await resizeImage(tempDataUri, 480);
        return resizedDataUri;
      })
    );
    clearScreenshots();

    debug(`最终实际使用到的窗口截图id: ${JSON.stringify(usedWindowIds)}`);

    // 将 uriList 中的每个 dataUri 作为 content 的一个元素
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: sgc.systemPrompt
      },
      {
        role: 'user',
        content: uriList.map((dataUri) => ({
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
  } catch (error) {
    console.error(error);
    return '获取屏幕内容失败';
  }
}

export async function testScreenAnalysis(ids: number[] | null = null): Promise<{ success: boolean; message: string }> {
  const sgc = useScreenAnalysisConfigStore();
  if (!sgc.apiKey || !sgc.baseURL || !sgc.model) {
    return { success: false, message: '请正确配置屏幕分析AI服务' };
  }

  try {
    if (!ids || ids.length === 0) {
      ids = [(await getScreenshotableWindows())[0].id];
    }
    const result = await describeScreens(ids);
    return { success: true, message: `屏幕分析成功: ${result}` };
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return { success: false, message: `屏幕分析失败: ${errorMessage}` };
  }
}
