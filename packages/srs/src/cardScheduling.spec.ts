import { scheduleAfterAnswer, previewReviewIntervals } from "./cardScheduling";
import type { CardScheduleSnapshot } from "./globalSettings";
import { defaultGlobalSpacedRepetitionSettings } from "./globalSettings";

describe("cardScheduling", () => {
  const settings = defaultGlobalSpacedRepetitionSettings;

  const createSnapshot = (
    phase: CardScheduleSnapshot["phase"],
    learningStepIndex = 0,
    intervalDays = 1,
    easePermille = 2500
  ): CardScheduleSnapshot => ({
    phase,
    learningStepIndex,
    intervalDays,
    easePermille,
  });

  describe("scheduleAfterAnswer - learning phase", () => {
    it("skips first step and moves to next index/delay on Good rating with multi-step settings", () => {
      const customSettings = {
        ...settings,
        learningStepsSeconds: [60, 600],
      };
      const snap = createSnapshot("learning", 0);
      const outcome = scheduleAfterAnswer(snap, "good", 0, customSettings);

      expect(outcome.phase).toBe("learning");
      expect(outcome.learningStepIndex).toBe(2);
      expect(outcome.dueInSecondsFromNow).toBe(600);
    });

    it("graduates immediately on Good rating with single-step settings", () => {
      const customSettings = {
        ...settings,
        learningStepsSeconds: [600],
        graduatingIntervalDays: 1,
      };
      const snap = createSnapshot("learning", 0);
      const outcome = scheduleAfterAnswer(snap, "good", 0, customSettings);

      expect(outcome.phase).toBe("review");
      expect(outcome.dueInSecondsFromNow).toBeNull();
      expect(outcome.intervalDays).toBe(1);
    });

    it("resets to step 0 on Again rating", () => {
      const customSettings = {
        ...settings,
        learningStepsSeconds: [60, 600],
      };
      const snap = createSnapshot("learning", 2);
      const outcome = scheduleAfterAnswer(snap, "again", 0, customSettings);

      expect(outcome.phase).toBe("learning");
      expect(outcome.learningStepIndex).toBe(0);
      expect(outcome.dueInSecondsFromNow).toBe(60);
    });

    it("immediately graduates to review phase on Easy rating", () => {
      const snap = createSnapshot("learning", 0);
      const outcome = scheduleAfterAnswer(snap, "easy", 0, settings);

      expect(outcome.phase).toBe("review");
      expect(outcome.dueInSecondsFromNow).toBeNull();
      expect(outcome.intervalDays).toBeGreaterThanOrEqual(settings.graduatingIntervalDays);
    });

    it("stays in learning on Hard rating", () => {
      const snap = createSnapshot("learning", 0);
      const outcome = scheduleAfterAnswer(snap, "hard", 0, settings);
      expect(outcome.phase).toBe("learning");
      expect(outcome.learningStepIndex).toBe(0);
      expect(outcome.dueInSecondsFromNow).toBe(settings.learningHardDelaySeconds);
    });

    it("advances step on Good rating when learningStepIndex > 0", () => {
      const customSettings = {
        ...settings,
        learningStepsSeconds: [60, 600, 1200],
      };
      const snap = createSnapshot("learning", 1);
      const outcome = scheduleAfterAnswer(snap, "good", 0, customSettings);
      expect(outcome.phase).toBe("learning");
      expect(outcome.learningStepIndex).toBe(2);
      expect(outcome.dueInSecondsFromNow).toBe(600);
    });
  });

  describe("scheduleAfterAnswer - relearning phase", () => {
    it("graduates immediately on Easy rating", () => {
      const snap = createSnapshot("relearning", 0, 10, 2500);
      const outcome = scheduleAfterAnswer(snap, "easy", 0, settings);
      expect(outcome.phase).toBe("review");
      expect(outcome.dueInSecondsFromNow).toBeNull();
      expect(outcome.intervalDays).toBeGreaterThan(0);
    });

    it("resets to step 0 on Again rating", () => {
      const customSettings = { ...settings, relearningStepsSeconds: [600, 1200] };
      const snap = createSnapshot("relearning", 1, 10, 2500);
      const outcome = scheduleAfterAnswer(snap, "again", 0, customSettings);
      expect(outcome.phase).toBe("relearning");
      expect(outcome.learningStepIndex).toBe(0);
      expect(outcome.dueInSecondsFromNow).toBe(600);
    });

    it("stays in relearning on Hard rating", () => {
      const customSettings = { ...settings, relearningStepsSeconds: [600, 1200] };
      const snap = createSnapshot("relearning", 1, 10, 2500);
      const outcome = scheduleAfterAnswer(snap, "hard", 0, customSettings);
      expect(outcome.phase).toBe("relearning");
      expect(outcome.learningStepIndex).toBe(1);
      expect(outcome.dueInSecondsFromNow).toBe(settings.relearningHardDelaySeconds);
    });

    it("advances step on Good rating", () => {
      const customSettings = { ...settings, relearningStepsSeconds: [600, 1200] };
      const snap = createSnapshot("relearning", 1, 10, 2500);
      const outcome = scheduleAfterAnswer(snap, "good", 0, customSettings);
      expect(outcome.phase).toBe("relearning");
      expect(outcome.learningStepIndex).toBe(2); // reaches end
      expect(outcome.dueInSecondsFromNow).toBe(1200);
    });

    it("skips first step on Good rating if at index 0", () => {
      const customSettings = { ...settings, relearningStepsSeconds: [600, 1200] };
      const snap = createSnapshot("relearning", 0, 10, 2500);
      const outcome = scheduleAfterAnswer(snap, "good", 0, customSettings);
      expect(outcome.phase).toBe("relearning");
      expect(outcome.learningStepIndex).toBe(2);
      expect(outcome.dueInSecondsFromNow).toBe(1200);
    });

    it("graduates on Good rating if at index 0 and 1 step", () => {
      const customSettings = { ...settings, relearningStepsSeconds: [600] };
      const snap = createSnapshot("relearning", 0, 10, 2500);
      const outcome = scheduleAfterAnswer(snap, "good", 0, customSettings);
      expect(outcome.phase).toBe("review");
    });

    it("graduates immediately when relearningStepsSeconds is empty", () => {
      const customSettings = { ...settings, relearningStepsSeconds: [] };
      const snap = createSnapshot("relearning", 0, 10, 2500);
      const outcome = scheduleAfterAnswer(snap, "again", 0, customSettings);
      expect(outcome.phase).toBe("review");
      expect(outcome.dueInSecondsFromNow).toBeNull();
    });
  });

  describe("scheduleAfterAnswer - review phase", () => {
    it("increases interval on Good rating in review phase", () => {
      const snap = createSnapshot("review", 0, 10, 2500);
      const outcome = scheduleAfterAnswer(snap, "good", 0, settings);

      expect(outcome.phase).toBe("review");
      expect(outcome.intervalDays).toBeGreaterThan(10);
      expect(outcome.dueInSecondsFromNow).toBeNull();
    });

    it("moves to relearning phase on Again rating in review phase", () => {
      const snap = createSnapshot("review", 0, 10, 2500);
      const outcome = scheduleAfterAnswer(snap, "again", 0, settings);

      if (settings.relearningStepsSeconds.length > 0) {
        expect(outcome.phase).toBe("relearning");
        expect(outcome.learningStepIndex).toBe(0);
        expect(outcome.dueInSecondsFromNow).toBe(settings.relearningStepsSeconds[0]);
      } else {
        expect(outcome.phase).toBe("review");
        expect(outcome.dueInSecondsFromNow).toBeNull();
      }
    });

    it("stays in review on Again if relearningStepsSeconds is empty", () => {
      const customSettings = { ...settings, relearningStepsSeconds: [] };
      const snap = createSnapshot("review", 0, 10, 2500);
      const outcome = scheduleAfterAnswer(snap, "again", 0, customSettings);

      expect(outcome.phase).toBe("review");
      expect(outcome.dueInSecondsFromNow).toBeNull();
      expect(outcome.intervalDays).toBeGreaterThan(0);
    });
  });

  describe("previewReviewIntervals", () => {
    it("calculates candidate review intervals", () => {
      const snap = createSnapshot("review", 0, 10, 2500);
      const intervals = previewReviewIntervals(snap, 0, settings);

      expect(intervals.hard).toBeDefined();
      expect(intervals.good).toBeDefined();
      expect(intervals.easy).toBeDefined();
      expect(intervals.easy).toBeGreaterThan(intervals.good);
    });
  });
});
