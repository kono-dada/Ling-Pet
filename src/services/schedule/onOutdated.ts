// Stub for handling outdated tasks. Implement your logic here.
export async function onOutdated(
  prompt: string,
  ctx: { scheduledAt: number; outdatedAt?: number }
): Promise<void> {
  console.log('[onOutdated] invoked', { prompt, ...ctx, now: Date.now() })
  // TODO: implement what to do when a task is outdated
}
