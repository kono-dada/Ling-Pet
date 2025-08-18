import type { Tool } from './types';
import type { ExecToolResult } from './types'

const registry = new Map<string, Tool>();

export function registerTool(tool: Tool) {
  registry.set(tool.name, tool);
}

export function getTool(name: string): Tool | undefined {
  return registry.get(name);
}

export async function callToolByName(
  name: string,
  args: string[],
): Promise<ExecToolResult> {
  console.log(`Calling tool ${name} with args:`, args);
  const tool = registry.get(name);
  if (!tool) {
    return { ok: false, error: `Unknown tool: ${name}`, continue: false };
  }
  try {
    const result = await tool.call(...args);
    return result;
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`Tool ${name} failed`, e);
    return { ok: false, error: msg, continue: false };
  }
}

// 返回可读的工具描述列表，用于在提示词中展示
export function listTools(): string[] {
  return Array.from(registry.values()).map((tool) => {
    const base = `- 名称：${tool.name}`;
    const desc = (tool.description ?? '').trim();
    if (!desc) return base;
    // 若 description 已包含“参数：/功能：”，直接附加；否则作为“功能：”展示
    const hasStructured = /参数：|功能：/.test(desc);
    const detail = hasStructured ? desc : `功能：${desc}`;
    return `${base}\n  ${detail}`;
  });
}
