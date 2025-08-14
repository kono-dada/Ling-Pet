import { getScreenshotableWindows } from "./screenDescription";
import { useCurrentWindowListStore } from "../../stores/currentWindowList";

const currentWindowList = useCurrentWindowListStore();

async function updateWindowState() {
  const windows = await getScreenshotableWindows();
  const newWindows = currentWindowList.update(windows);
  // 如果非空就log
  if (newWindows.length > 0) {
    console.log('新增窗口列表:', newWindows);
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
