import { useConversationStore } from '../../stores/conversation';
import type { PetResponseItem } from '../../types/ai';
import { EMOTION_CODE_MAP } from '../../constants/emotions';

// A simple demo handler for avatar multi-click event.
// It injects two messages to the chat bubble without calling any model.
export async function handleAvatarMultiClick(_payload: { ts: number; threshold: number; windowMs: number }) {
  const conversation = useConversationStore();

  const items: PetResponseItem[] = [
    {
      message: '别戳啦，我会痒的！',
      emotion: EMOTION_CODE_MAP['生气'],
      japanese: 'つつかないで、くすぐったいよ！',
    },
    {
      message: '好啦好啦，有什么事嘛？',
      emotion: EMOTION_CODE_MAP['正常'],
      japanese: 'わかったって、わかったって。何なの？',
    },
  ];

  for (const it of items) {
    // eslint-disable-next-line no-await-in-loop
    await conversation.addItem(it);
  }
}
