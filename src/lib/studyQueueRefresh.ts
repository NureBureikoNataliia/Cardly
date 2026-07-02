export type ReviewOutcomeLike = {
  due_in_seconds_from_now?: number | null;
} | undefined;

export type SessionLoadMode = "full" | "silent";

export type QueueRefreshOptions = {
  preserveSessionQueue?: boolean;
};

export function shouldRefreshQueueAfterReview(
  outcome: ReviewOutcomeLike,
  options: QueueRefreshOptions = {},
): boolean {
  if (options.preserveSessionQueue) return false;
  const seconds = outcome?.due_in_seconds_from_now;
  if (seconds == null) return true;
  return seconds > 0;
}

export function mergeQueueWithPreservedCards<T extends { card: { card_id: string } }>(
  previousQueue: T[],
  freshQueue: T[],
  preserveCount: number,
): T[] {
  const preserved = previousQueue.slice(1, 1 + preserveCount);
  const preservedIds = new Set(preserved.map((item) => item.card.card_id));
  const remainingFresh = freshQueue.filter((item) => !preservedIds.has(item.card.card_id));
  return [...preserved, ...remainingFresh];
}

export function shouldResetSessionUi(mode: SessionLoadMode): boolean {
  return mode === "full";
}
