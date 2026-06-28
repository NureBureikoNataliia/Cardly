import { formatScheduleLabel } from "../formatScheduleLabel";
import type { ScheduleOutcome } from "@cardly/srs/cardScheduling";

describe("formatScheduleLabel", () => {
  const baseOutcome: ScheduleOutcome = {
    phase: "learning",
    learningStepIndex: 0,
    easePermille: 2500,
    intervalDays: 0,
    dueInSecondsFromNow: null,
  };

  describe("when dueInSecondsFromNow is set (short-term delay)", () => {
    it("returns <1m for values under 60 seconds", () => {
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: 30 })).toBe("<1m");
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: 59 })).toBe("<1m");
    });

    it("returns minutes (rounded) for values under 1 hour (3600 seconds)", () => {
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: 60 })).toBe("1m");
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: 150 })).toBe("3m");
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: 3540 })).toBe("59m");
    });

    it("returns hours (rounded) for values under 24 hours (86,400 seconds)", () => {
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: 3600 })).toBe("1h");
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: 7200 })).toBe("2h");
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: 82800 })).toBe("23h");
    });

    it("returns days (to 1 decimal place) for values 24 hours or greater", () => {
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: 86400 })).toBe("1.0d");
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: 129600 })).toBe("1.5d");
    });
  });

  describe("when dueInSecondsFromNow is null (mature interval days)", () => {
    it("returns 0d for intervalDays 0 or less", () => {
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: null, intervalDays: 0 })).toBe("0d");
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: null, intervalDays: -1 })).toBe("0d");
    });

    it("returns days (rounded) for intervalDays under 30", () => {
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: null, intervalDays: 1 })).toBe("1d");
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: null, intervalDays: 29 })).toBe("29d");
    });

    it("returns months (to 1 decimal place) for intervalDays under 365", () => {
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: null, intervalDays: 30 })).toBe("1.0mo");
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: null, intervalDays: 45 })).toBe("1.5mo");
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: null, intervalDays: 364 })).toBe("12.1mo");
    });

    it("returns years (to 1 decimal place) for intervalDays 365 or greater", () => {
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: null, intervalDays: 365 })).toBe("1.0y");
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: null, intervalDays: 730 })).toBe("2.0y");
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: null, intervalDays: 1000 })).toBe("2.7y");
    });
  });

  describe("Ukrainian locale", () => {
    it("uses Ukrainian unit suffixes", () => {
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: 30 }, "uk")).toBe("<1хв");
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: 150 }, "uk")).toBe("3хв");
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: 7200 }, "uk")).toBe("2г");
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: 86400 }, "uk")).toBe("1.0д");
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: null, intervalDays: 7 }, "uk")).toBe("7д");
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: null, intervalDays: 45 }, "uk")).toBe("1.5міс");
      expect(formatScheduleLabel({ ...baseOutcome, dueInSecondsFromNow: null, intervalDays: 365 }, "uk")).toBe("1.0р");
    });
  });
});
