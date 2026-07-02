import {
  easeFactorToPermille,
  permilleToEaseFactor,
  progressRowToSnapshot,
  phaseToDbStatus,
  snapshotToDbStatus,
  scheduleOutcomeToProgressPatch,
  applyRatingToProgressRow,
  nextDueDateFromOutcome,
  delayDaysForReview,
  appSettingsRowToGlobal,
  nextRepetitionsCount,
  initialUserCardProgressPayload,
} from "./dbMapping";
import type {
  UserCardProgressRow,
  AppSpacedRepetitionSettingsRow,
} from "./dbTypes";
import type { ScheduleOutcome } from "./cardScheduling";

describe("dbMapping", () => {
  const dummyRow: UserCardProgressRow = {
    user_id: "user-123",
    card_id: "card-456",
    status: "new",
    due_date: null,
    interval_days: 0,
    ease_factor: 2.5,
    repetitions: 0,
    last_reviewed_at: null,
    learning_step_index: 0,
  };

  const dummySettings: AppSpacedRepetitionSettingsRow = {
    id: 1,
    learning_steps_seconds: [60, 600],
    relearning_steps_seconds: [600],
    graduating_interval_days: 1,
    easy_interval_during_learning_days: 4,
    learning_hard_delay_seconds: 60,
    relearning_hard_delay_seconds: 600,
    interval_modifier: 1.0,
    easy_bonus: 1.3,
    lapse_interval_multiplier: 0.0,
    ease_minimum_permille: 1300,
    min_lapse_interval_days: 1,
    updated_at: "2026-06-25T20:00:00Z",
  };

  describe("conversion functions", () => {
    it("converts ease factor to permille", () => {
      expect(easeFactorToPermille(2.5)).toBe(2500);
      expect(easeFactorToPermille(1.3)).toBe(1300);
      expect(easeFactorToPermille(2.6543)).toBe(2654);
    });

    it("converts permille to ease factor", () => {
      expect(permilleToEaseFactor(2500)).toBe(2.5);
      expect(permilleToEaseFactor(1300)).toBe(1.3);
      expect(permilleToEaseFactor(2654)).toBe(2.654);
    });
  });

  describe("progressRowToSnapshot", () => {
    it("maps 'new' status to learning phase at step 0", () => {
      const snap = progressRowToSnapshot({ ...dummyRow, status: "new" });
      expect(snap).toEqual({
        phase: "learning",
        learningStepIndex: 0,
        easePermille: 2500,
        intervalDays: 0,
      });
    });

    it("maps 'learning' status", () => {
      const snap = progressRowToSnapshot({
        ...dummyRow,
        status: "learning",
        learning_step_index: 2,
        interval_days: 3,
        ease_factor: 2.2,
      });
      expect(snap).toEqual({
        phase: "learning",
        learningStepIndex: 2,
        easePermille: 2200,
        intervalDays: 3,
      });
    });

    it("maps 'relearning' status", () => {
      const snap = progressRowToSnapshot({
        ...dummyRow,
        status: "relearning",
        learning_step_index: 1,
        interval_days: 4,
        ease_factor: 1.8,
      });
      expect(snap).toEqual({
        phase: "relearning",
        learningStepIndex: 1,
        easePermille: 1800,
        intervalDays: 4,
      });
    });

    it("maps 'review' status, ensuring intervalDays is at least 1", () => {
      const snapZeroInterval = progressRowToSnapshot({
        ...dummyRow,
        status: "review",
        interval_days: 0,
      });
      expect(snapZeroInterval.intervalDays).toBe(1);

      const snapValidInterval = progressRowToSnapshot({
        ...dummyRow,
        status: "review",
        interval_days: 15,
      });
      expect(snapValidInterval.intervalDays).toBe(15);
    });

    it("uses default values if optional fields are missing or invalid", () => {
      const rowMissingFields: UserCardProgressRow = {
        user_id: "user-123",
        card_id: "card-456",
        status: "learning",
        due_date: null,
        interval_days: null,
        ease_factor: null,
        repetitions: null,
        last_reviewed_at: null,
      };

      const snap = progressRowToSnapshot(rowMissingFields);
      expect(snap.easePermille).toBe(2500); // DEFAULT_EASE_PERMILLE
      expect(snap.intervalDays).toBe(0);
      expect(snap.learningStepIndex).toBe(0);
    });
  });

  describe("phaseToDbStatus and snapshotToDbStatus", () => {
    it("maps phase to DbProgressStatus correctly", () => {
      expect(phaseToDbStatus("learning")).toBe("learning");
      expect(phaseToDbStatus("relearning")).toBe("relearning");
      expect(phaseToDbStatus("review")).toBe("review");
    });

    it("maps snapshot status correctly", () => {
      expect(snapshotToDbStatus({ phase: "learning", learningStepIndex: 0, easePermille: 2500, intervalDays: 0 })).toBe("learning");
      expect(snapshotToDbStatus({ phase: "relearning", learningStepIndex: 0, easePermille: 2500, intervalDays: 0 })).toBe("relearning");
      expect(snapshotToDbStatus({ phase: "review", learningStepIndex: 0, easePermille: 2500, intervalDays: 0 })).toBe("review");
    });
  });

  describe("scheduleOutcomeToProgressPatch", () => {
    const reviewDate = new Date("2026-06-25T12:00:00.000Z");

    it("creates correct patch for learning phase with dueInSecondsFromNow", () => {
      const outcome: ScheduleOutcome = {
        phase: "learning",
        learningStepIndex: 1,
        easePermille: 2500,
        intervalDays: 0,
        dueInSecondsFromNow: 60,
      };

      const patch = scheduleOutcomeToProgressPatch(outcome, reviewDate);

      expect(patch).toEqual({
        status: "learning",
        due_date: new Date(reviewDate.getTime() + 60 * 1000).toISOString(),
        interval_days: 0,
        ease_factor: 2.5,
        learning_step_index: 1,
        last_reviewed_at: reviewDate.toISOString(),
      });
    });

    it("creates correct patch for review phase with intervalDays", () => {
      const outcome: ScheduleOutcome = {
        phase: "review",
        learningStepIndex: 0,
        easePermille: 2600,
        intervalDays: 5,
        dueInSecondsFromNow: null,
      };

      const patch = scheduleOutcomeToProgressPatch(outcome, reviewDate);

      expect(patch).toEqual({
        status: "review",
        due_date: new Date(reviewDate.getTime() + 5 * 86400000).toISOString(),
        interval_days: 5,
        ease_factor: 2.6,
        learning_step_index: 0,
        last_reviewed_at: reviewDate.toISOString(),
      });
    });
  });

  describe("nextDueDateFromOutcome", () => {
    const baseDate = new Date("2026-06-25T10:00:00Z");

    it("calculates due date from seconds when dueInSecondsFromNow is set", () => {
      const outcome: ScheduleOutcome = {
        phase: "learning",
        learningStepIndex: 1,
        easePermille: 2500,
        intervalDays: 0,
        dueInSecondsFromNow: 300,
      };
      const due = nextDueDateFromOutcome(outcome, baseDate);
      expect(due.getTime()).toBe(baseDate.getTime() + 300 * 1000);
    });

    it("calculates due date from days when dueInSecondsFromNow is null", () => {
      const outcome: ScheduleOutcome = {
        phase: "review",
        learningStepIndex: 0,
        easePermille: 2500,
        intervalDays: 4,
        dueInSecondsFromNow: null,
      };
      const due = nextDueDateFromOutcome(outcome, baseDate);
      expect(due.getTime()).toBe(baseDate.getTime() + 4 * 86400000);
    });
  });

  describe("delayDaysForReview", () => {
    const now = new Date("2026-06-25T12:00:00Z");

    it("returns 0 if dueIso is null or empty", () => {
      expect(delayDaysForReview(null, now)).toBe(0);
      expect(delayDaysForReview("", now)).toBe(0);
    });

    it("returns 0 if dueIso is an invalid date string", () => {
      expect(delayDaysForReview("not-a-date", now)).toBe(0);
    });

    it("calculates the fraction of days late correctly when now is after due date", () => {
      const dueIso = "2026-06-24T12:00:00Z"; // 1 day late
      expect(delayDaysForReview(dueIso, now)).toBe(1);

      const dueIsoHalfDay = "2026-06-25T00:00:00Z"; // 12 hours late
      expect(delayDaysForReview(dueIsoHalfDay, now)).toBe(0.5);
    });

    it("returns 0 if now is before the due date", () => {
      const dueIso = "2026-06-26T12:00:00Z"; // 1 day early
      expect(delayDaysForReview(dueIso, now)).toBe(0);
    });
  });

  describe("appSettingsRowToGlobal", () => {
    it("maps DB settings row fields to global options", () => {
      const global = appSettingsRowToGlobal(dummySettings);
      expect(global).toEqual({
        intervalModifier: 1.0,
        easyBonus: 1.3,
        lapseIntervalMultiplier: 0.0,
        easeMinimum: 1300,
        minLapseIntervalDays: 1,
        learningStepsSeconds: [60, 600],
        relearningStepsSeconds: [600],
        graduatingIntervalDays: 1,
        easyIntervalDuringLearningDays: 4,
        learningHardDelaySeconds: 60,
        relearningHardDelaySeconds: 600,
      });
    });
  });

  describe("nextRepetitionsCount", () => {
    it("returns 1 if previous is null or undefined and rating is not again", () => {
      expect(nextRepetitionsCount(null, "good")).toBe(1);
      expect(nextRepetitionsCount(undefined, "easy")).toBe(1);
    });

    it("returns 0 if previous is null or undefined and rating is again", () => {
      expect(nextRepetitionsCount(null, "again")).toBe(0);
      expect(nextRepetitionsCount(undefined, "again")).toBe(0);
    });

    it("increments the count if rating is not again", () => {
      expect(nextRepetitionsCount(5, "good")).toBe(6);
      expect(nextRepetitionsCount(5, "hard")).toBe(6);
      expect(nextRepetitionsCount(5, "easy")).toBe(6);
    });

    it("keeps the count unchanged if rating is again", () => {
      expect(nextRepetitionsCount(5, "again")).toBe(5);
    });
  });

  describe("initialUserCardProgressPayload", () => {
    it("returns a baseline database insert payload for a new card", () => {
      const payload = initialUserCardProgressPayload("user-1", "card-2");
      expect(payload).toEqual({
        user_id: "user-1",
        card_id: "card-2",
        status: "new",
        due_date: null,
        interval_days: 0,
        ease_factor: 2.5,
        repetitions: 0,
        learning_step_index: 0,
        last_reviewed_at: null,
      });
    });
  });

  describe("applyRatingToProgressRow", () => {
    const reviewDate = new Date("2026-06-25T12:00:00.000Z");

    it("optimistically applies review rating and outputs updated row and scheduler outcome", () => {
      const row: UserCardProgressRow = {
        ...dummyRow,
        status: "learning",
        learning_step_index: 0,
      };

      const result = applyRatingToProgressRow(row, "good", dummySettings, reviewDate);

      // In default learning settings:
      // first step delay is skipped on first Good, so it goes to second step (600 seconds)
      expect(result.outcome.phase).toBe("learning");
      expect(result.outcome.learningStepIndex).toBe(2);
      expect(result.outcome.dueInSecondsFromNow).toBe(600);

      // Check row update
      expect(result.progress.status).toBe("learning");
      expect(result.progress.learning_step_index).toBe(2);
      expect(result.progress.repetitions).toBe(1);
      expect(result.progress.due_date).toBe(new Date(reviewDate.getTime() + 600 * 1000).toISOString());
    });
  });
});
