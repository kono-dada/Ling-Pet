import { defineStore } from 'pinia';
import { scenarioRegistry } from '../scenarios/registry';

export const useScenarioStore = defineStore('scenario', {
    state: () => ({
        currentScenarioKey: null as string | null, // 持久化的关键字段
        currentState: {} as Record<string, any>
    }),

    actions: {
        setScenarioByKey(key: string) {
            const scenario = scenarioRegistry[key];
            if (!scenario) throw new Error(`Unknown scenario key: ${key}`);
            this.currentScenarioKey = key;
            this.currentState = scenario.getInitialState();
        },

        getPrompt(): string {
            if (!this.currentScenarioKey) return '';
            const scenario = scenarioRegistry[this.currentScenarioKey];
            return scenario.getPrompts(this.currentState);
        },

        updateState(updates: Record<string, any>) {
            if (!this.currentScenarioKey) return;
            const scenario = scenarioRegistry[this.currentScenarioKey];
            this.currentState = scenario.updateState(this.currentState, updates);
        },

        initializeState() {
            if (!this.currentScenarioKey) return;

            const scenario = scenarioRegistry[this.currentScenarioKey];
            const initialState = scenario.getInitialState();

            // 只合并 initialState 已有的 key
            const updatedState = { ...initialState };
            for (const key in initialState) {
                if (key in this.currentState) {
                    updatedState[key] = this.currentState[key];
                }
            }

            this.currentState = updatedState;
            console.log(`Scenario ${this.currentScenarioKey} initialized with state:`, this.currentState);
        },

        reset() {
            this.setScenarioByKey('normal'); // 默认设置为 normal 场景
        }
    },
    tauri: {
        saveOnChange: true,

        // You can also debounce or throttle when saving.
        // This is optional. The default behavior is to save immediately.
        saveStrategy: 'debounce',
        saveInterval: 500,
    },

},);