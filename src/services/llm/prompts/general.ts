import { useMemoryStore } from "../../../stores/memory";
import { useHypothesesStore } from "../../../stores/hypotheses";

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