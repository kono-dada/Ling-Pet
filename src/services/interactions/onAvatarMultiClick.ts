import { useStreamConversation } from '../../composables/useStreamConversation';
import type { PetResponseItem } from '../../types/ai';
import { EMOTION_CODE_MAP } from '../../constants/emotions';
import { EmotionName } from '../../types/emotion';

// A simple demo handler for avatar multi-click event.
// It injects two messages to the chat bubble without calling any model.
export async function handleAvatarMultiClick(_payload: { ts: number; threshold: number; windowMs: number }) {
  const { addStreamItem } = useStreamConversation();

  const items: PetResponseItem[] = [
    {
      message: '别戳啦，我会痒的！',
      emotion: EMOTION_CODE_MAP[EmotionName.调皮],
      japanese: '',
    },
    {
      message: '好啦好啦，有什么事嘛？',
      emotion: EMOTION_CODE_MAP[EmotionName.微笑],
      japanese: '',
    },
  ];

  for (const it of items) {
    // eslint-disable-next-line no-await-in-loop
    await addStreamItem(it);
  }
}

