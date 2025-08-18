import { useMemoryStore } from "../../../stores/memory";
import { useHypothesesStore } from "../../../stores/hypotheses";
import { getScreenshotableWindows } from "../../screenAnalysis/screenDescription";

export function getMemoryPrompt(): string {
  return `
#### 记忆

以下是你之前积累的记忆：
${useMemoryStore().getAllAsJSON()}

`
}

export function getHypothesesPrompt(): string {
  return `
#### 假设

以下是你之前对用户特点的推测：
${useHypothesesStore().getAllAsJSON()}

`
}

export async function getScreenshotsPrompt(): Promise<string> {
  return `
#### 截图

以下是当前可截图窗口的列表：
${JSON.stringify(await getScreenshotableWindows())}
当你想查看窗口时，记得在对应的工具中填写id。

`
}