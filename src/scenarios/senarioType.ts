export interface Scenario<StateType extends Record<string, any>> {
  key: string; // scenario标识
  scenarioPrompt: string; // scenario的提示信息
  getInitialState(): StateType;
  getPrompts(state: StateType): string; // 返回包含 scenarioPrompt 和 JSON 的字符串
  updateState(prev: StateType, updates: Partial<StateType>): StateType;
}