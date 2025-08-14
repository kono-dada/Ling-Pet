import { getScreenshotableWindows } from "./screenDescription";
import { useCurrentWindowListStore } from "../../stores/currentWindowList";
import { onNewWindows } from "./onNewWindows";
import { usePetStateStore } from "../../stores/petState";

const currentWindowList = useCurrentWindowListStore();
const petState = usePetStateStore();

async function updateWindowState() {
  const windows = await getScreenshotableWindows();
  const newWindows = currentWindowList.update(windows);
  if (newWindows.length > 0 && Date.now() - petState.lastClickTimestamp > 10000) {
    console.log('新增窗口列表:', newWindows);
    onNewWindows(newWindows);
  }
}

export function windowListMaintainer() {
  let intervalId: number | null = null;
  function startWindowListMaintaining() {
    if (!intervalId) {
      intervalId = setInterval(updateWindowState, 5000);
    }
  }

  function stopWindowListMaintaining() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  return {
    startWindowListMaintaining,
    stopWindowListMaintaining
  };
}
