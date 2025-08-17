export * from './types';
export * from './registry';

// Register built-in/example tools here
import { registerTool } from './registry';
// import { addNotificationTool } from './tools/addNotification';
import { addScheduleTool } from './tools/addSchedule';

export function registerDefaultTools() {
  // registerTool(addNotificationTool);
  registerTool(addScheduleTool);
}
