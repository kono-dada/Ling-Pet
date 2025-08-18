import { ScreenshotableWindow } from "tauri-plugin-screenshots-api";
import { describeScreens } from "../../services/screenAnalysis/screenDescription";
import { useAIConfigStore } from "../../stores/aiConfig";
import { chatWithPetStream } from "../../services/chatAndVoice/chatWithPet";
import { useConversationStore } from "../../stores/conversation";
import { usePetStateStore } from "../../stores/petState";

const aiConfig = useAIConfigStore();
const petState = usePetStateStore();
const conversation = useConversationStore();

const USERPROMPT =
  `System: 你已经很久没有收到消息回复啦，于是你忍不住偷偷看了一下他的电脑屏幕，发现他刚刚打开了一个新窗口
<screen-content>
{screenContent}
</screen-content>
你要对他说些什么呢？
`

export async function handleNewWindows(newWindows: ScreenshotableWindow[]) {
  if (!Array.isArray(newWindows) || newWindows.length === 0) return;

  // Basic guards
  if (!aiConfig.apiKey || !aiConfig.baseURL || !aiConfig.model) {
    console.warn("AI服务配置不完整，无法进行屏幕分析");
    return;
  }
  if (conversation.responseItems.length > 0) {
    console.log("当前有未完成的对话，放弃");
    return;
  }
  if (Date.now() - petState.lastClickTimestamp < 10000) {
    // 与之前逻辑保持一致：最近10秒有交互则跳过
    return;
  }

  const analysisResult = await describeScreens(newWindows.map((w) => w.id));
  await chatWithPetStream(
    USERPROMPT.replace('{screenContent}', analysisResult)
  );
}
