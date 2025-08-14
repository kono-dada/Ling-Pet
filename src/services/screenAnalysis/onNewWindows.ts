import { ScreenshotableWindow } from "tauri-plugin-screenshots-api";
import { describeScreens } from "./screenDescription";
import { useAIConfigStore } from "../../stores/aiConfig";
import { useChatBubbleStateStore } from "../../stores/chatBubbleState";
import { chatWithPetStream } from "../chatWithPet";
import { useStreamConversation } from "../../composables/useStreamConversation";

const aiConfig = useAIConfigStore();
const chatBubbleState = useChatBubbleStateStore();
const { addStreamItem } = useStreamConversation();

const USERPROMPT =
  `System: 你已经很久没有收到消息回复啦，于是你忍不住偷偷看了一下他的电脑屏幕，发现他刚刚打开了一个新窗口
<screen-content>
{screenContent}
</screen-content>
你要对他说些什么呢？
`

export async function onNewWindows(newWindows: ScreenshotableWindow[]) {
  if (!aiConfig.apiKey || !aiConfig.baseURL || !aiConfig.model) {
    console.warn("AI服务配置不完整，无法进行屏幕分析");
    return;
  }
  if (chatBubbleState.responseItems.length > 0) {
    console.log("当前有未完成的对话，放弃");
    return;
  }
  const analysisResult = await describeScreens(newWindows.map(window => window.id));
  await chatWithPetStream(USERPROMPT.replace('{screenContent}', analysisResult), addStreamItem);
}