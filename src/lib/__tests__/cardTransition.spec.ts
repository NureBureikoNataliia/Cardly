import { shouldAnimateCardChange } from "../cardTransition";

describe("cardTransition", () => {
  it("animates when the visible card changes", () => {
    expect(shouldAnimateCardChange("card-1", "card-2")).toBe(true);
    expect(shouldAnimateCardChange("card-1", "card-1")).toBe(false);
    expect(shouldAnimateCardChange(null, "card-2")).toBe(false);
  });
});
