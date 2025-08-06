import { NormalScenario } from "./classes/normal"
import { EroticScenario } from "./classes/erotic";
import { Scenario } from "./senarioType";
// 可扩展
export const scenarioRegistry: Record<string, Scenario<any>> = {
    normal: new NormalScenario(),
    erotic: new EroticScenario()
};