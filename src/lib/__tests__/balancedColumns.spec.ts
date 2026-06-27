import type { Card } from "@/assets/data/cards";
import { computePairedTileHeights, splitIntoBalancedColumns } from "../balancedColumns";

describe("splitIntoBalancedColumns", () => {
  it("returns a single column when columnCount is 1", () => {
    const items = ["a", "b", "c"];
    const cols = splitIntoBalancedColumns(items, 1, () => 100);
    expect(cols).toHaveLength(1);
    expect(cols[0].map((entry) => entry.item)).toEqual(items);
  });

  it("balances tall items across columns by estimated height", () => {
    const items = [
      { id: "tall-left", h: 400 },
      { id: "short-a", h: 80 },
      { id: "short-b", h: 80 },
      { id: "short-c", h: 80 },
    ];

    const cols = splitIntoBalancedColumns(
      items,
      2,
      (item) => item.h,
    );

    const leftIds = cols[0].map((entry) => entry.item.id);
    const rightIds = cols[1].map((entry) => entry.item.id);

    expect(leftIds).toContain("tall-left");
    expect(rightIds).toEqual(["short-a", "short-b", "short-c"]);
  });

  it("keeps original indices on entries", () => {
    const items = ["a", "b", "c"];
    const cols = splitIntoBalancedColumns(items, 2, (_, index) => (index === 0 ? 300 : 50));
    expect(cols.flat().map((entry) => entry.index)).toEqual([0, 1, 2]);
  });
});

describe("computePairedTileHeights", () => {
  const baseCard = {
    card_type: "basic",
    notes: null,
    card_media: [],
    created_at: "",
    updated_at: "",
    deck_id: "d1",
    created_by: null,
    card_extra: {},
  } as const;

  it("assigns the taller estimate to both cards in a reversed pair", () => {
    const forward = {
      ...baseCard,
      card_id: "f1",
      front_text: "Short",
      back_text: "A much longer back side that wraps across multiple lines in the list preview",
      card_extra: { pairId: "pair-1", pairRole: "forward" },
    };
    const reverse = {
      ...baseCard,
      card_id: "r1",
      front_text: "A much longer back side that wraps across multiple lines in the list preview",
      back_text: "Short",
      card_extra: { pairId: "pair-1", pairRole: "reverse" },
    };

    const heights = computePairedTileHeights([forward, reverse]);
    expect(heights.get("f1")).toBe(heights.get("r1"));
    expect(heights.get("f1")).toBeGreaterThan(140);
  });

  it("ignores cards without a pair partner", () => {
    const solo = {
      ...baseCard,
      card_id: "solo",
      front_text: "Only one",
      back_text: "Back",
      card_extra: { pairId: "pair-solo", pairRole: "forward" },
    };

    expect(computePairedTileHeights([solo]).size).toBe(0);
  });
});
