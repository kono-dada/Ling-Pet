import { Scenario } from "../senarioType";

type NormalScenarioState = {
  mood: string
  currentTopic: string
  userMoodGuess: string
  screenContent: string
  chatHistorySummary: string
}

export class NormalScenario implements Scenario<NormalScenarioState> {
  key = 'normal';
  scenarioPrompt = '你正在进行一段日常互动，请参考以下状态信息：';

  getInitialState(): NormalScenarioState {
    return {
      mood: 'neutral',
      currentTopic: '',
      userMoodGuess: '',
      screenContent: '',
      chatHistorySummary: ''
    };
  }

  getPrompts(state: NormalScenarioState): string {
    const schema = {
      mood: 'string (当前的总体情绪基调)',
      currentTopic: 'string (当前讨论的话题)',
      userMoodGuess: 'string (用户情绪猜测)',
      screenContent: 'string (屏幕内容)',
      chatHistorySummary: 'string (至今为止的聊天内容概括)'
    };

    const stateInfo = {
      data: state,
      schema
    };

    return `${this.scenarioPrompt}\n\n${JSON.stringify(stateInfo, null, 2)}`;
  }

  updateState(prev: NormalScenarioState, updates: Partial<NormalScenarioState>): NormalScenarioState {
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => key in prev)
    ) as Partial<NormalScenarioState>;

    return {
      ...prev,
      ...filteredUpdates
    };
  }
}