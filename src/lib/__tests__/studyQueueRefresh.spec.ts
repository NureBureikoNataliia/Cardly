import { mergeQueueWithPreservedCards, shouldRefreshQueueAfterReview, shouldResetSessionUi } from "../studyQueueRefresh";

describe("study queue refresh helpers", () => {
  it("reloads the queue after short-delay and normal reviews", () => {
    expect(shouldRefreshQueueAfterReview({ due_in_seconds_from_now: 60 })).toBe(true);
    expect(shouldRefreshQueueAfterReview({ due_in_seconds_from_now: null })).toBe(true);
    expect(shouldRefreshQueueAfterReview(undefined)).toBe(true);
  });

  it("pins the next cards from the previous session at the front of the rebuilt queue", () => {
    const previousQueue = [
      { card: { card_id: "current" }, progress: { status: "review" } },
      { card: { card_id: "next-1" }, progress: { status: "review" } },
      { card: { card_id: "next-2" }, progress: { status: "review" } },
      { card: { card_id: "next-3" }, progress: { status: "review" } },
      { card: { card_id: "next-4" }, progress: { status: "review" } },
      { card: { card_id: "next-5" }, progress: { status: "review" } },
      { card: { card_id: "next-6" }, progress: { status: "review" } },
    ] as any;
    const freshQueue = [
      { card: { card_id: "fresh-1" }, progress: { status: "review" } },
      { card: { card_id: "next-2" }, progress: { status: "review" } },
      { card: { card_id: "fresh-2" }, progress: { status: "review" } },
    ] as any;

    const merged = mergeQueueWithPreservedCards(previousQueue, freshQueue, 5);

    expect(merged.map((item: any) => item.card.card_id)).toEqual([
      "next-1",
      "next-2",
      "next-3",
      "next-4",
      "next-5",
      "fresh-1",
      "fresh-2",
    ]);
  });

  it("keeps the study UI intact for silent refreshes", () => {
    expect(shouldResetSessionUi("full")).toBe(true);
    expect(shouldResetSessionUi("silent")).toBe(false);
  });
});
