export * from './types';
export * from './registry';

// Register built-in/example tools here
import { registerTool } from './registry';
// import { addNotificationTool } from './tools/addNotification';
import { addScheduleTool } from './tools/addSchedule';
import { memoryAddTool } from './tools/memoryAdd';
import { memoryUpdateTool } from './tools/memoryUpdate';
import { hypothesisAddTool } from './tools/hypothesisAdd';
import { hypothesisUpdateTool } from './tools/hypothesisUpdate';

export function registerDefaultTools() {
  // registerTool(addNotificationTool);
  registerTool(addScheduleTool);
  registerTool(memoryAddTool);
  registerTool(memoryUpdateTool);
  registerTool(hypothesisAddTool);
  registerTool(hypothesisUpdateTool);
}
