// Demo runtime plugin: logs when SCHEDULE_IDLE fires
// Usage: move/copy this file to your app data plugins folder after build:
//   macOS:   ~/Library/Application Support/com.lingpet.app/plugins/
//   Windows: %APPDATA%/com.lingpet.app/plugins/
//   Linux:   ~/.local/share/com.lingpet.app/plugins/
// The app will auto-load any .mjs/.js in that folder on startup.

export default function pluginHandlers({ events, chat }) {
  return [
    {
      key: 'demo:schedule-idle-log',
      event: 'SCHEDULE_IDLE',
      blocking: false,
      isEnabled: () => true,
      handle: async ({ ts }) => {
        try {
          const iso = new Date(ts).toISOString();
          console.log(`[runtime-plugin] SCHEDULE_IDLE at ${iso}`);
          // Demo: trigger a tiny schedule chat
          await chat.chatForSchedule('123');
        } catch (e) {
          console.log('[runtime-plugin] SCHEDULE_IDLE (ts=', ts, ')');
        }
      },
    },
  ];
}
