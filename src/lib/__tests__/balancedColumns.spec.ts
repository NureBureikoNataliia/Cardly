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
