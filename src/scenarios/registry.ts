import { NormalScenario } from "./classes/normal"
import { Scenario } from "./senarioType";
// 可扩展
export const scenarioRegistry: Record<string, Scenario<any>> = {
    normal: new NormalScenario(),
};