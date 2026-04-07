/**
 * Anki-style review scheduling (modified SM-2) for **review** (mature) cards.
 *
 * References:
 * - Anki FAQ: spaced repetition algorithm overview (SM-2 family; FSRS optional since 23.10)
 * - Interval + ease updates aligned with legacy `sched.py` notes:
 *   https://gist.github.com/fasiha/31ce46c36371ff57fdbc1254af424174
 */

export type ReviewRating = "again" | "hard" | "good" | "easy";

/** Ease is stored as permille (Anki-style): 2500 ≈ factor 2.5. */
export const ANKI_DEFAULT_EASE_PERMILLE = 2500;
export const ANKI_MIN_EASE_PERMILLE = 1300;

export interface AnkiSchedulerConfig {
  /** Interval modifier `m` (Anki default 1.0). Scales all computed intervals. */
  intervalModifier: number;
  /** Easy bonus `m4` applied to the Easy interval (Anki default 1.3). */
  easyBonus: number;
  /**
   * Multiplier applied to previous interval on lapse: `i1 = m0 * i` (Anki "new interval" after lapse; default 0).
   * When 0, use `minLapseIntervalDays` so the card still gets a concrete day interval.
   */
  lapseIntervalMultiplier: number;
  /** Floor for ease (Anki uses 1300). */
  easeMinimum: number;
  /** When lapse formula yields 0, use at least this many days. */
  minLapseIntervalDays: number;
}

export const defaultAnkiSchedulerConfig: AnkiSchedulerConfig = {
  intervalModifier: 1.0,
  easyBonus: 1.3,
  lapseIntervalMultiplier: 0,
  easeMinimum: ANKI_MIN_EASE_PERMILLE,
  minLapseIntervalDays: 1,
};

/**
 * Computes Hard / Good / Easy interval candidates for one review, using the same
 * structure as Anki's `_nextRevIvl` chain (Hard → Good ≥ Hard+1 → Easy ≥ Good+1).
 *
 * `delayDays` = days between scheduled due date and actual review (0 if on time or early).
 */
export function computeCandidateIntervalsDays(
  previousIntervalDays: number,
  delayDays: number,
  easePermille: number,
  config: AnkiSchedulerConfig = defaultAnkiSchedulerConfig
): { hard: number; good: number; easy: number } {
  const i = Math.max(0, previousIntervalDays);
  const d = Math.max(0, delayDays);
  const f = easePermille;
  const m = config.intervalModifier;
  const m4 = config.easyBonus;

  const hard = Math.max(i + 1, (i + d / 4) * 1.2 * m);
  const good = Math.max(hard + 1, (i + d / 2) * (f / 1000) * m);
  const easy = Math.max(good + 1, (i + d) * (f / 1000) * m * m4);

  return {
    hard: Math.round(hard),
    good: Math.round(good),
    easy: Math.round(easy),
  };
}

/** Ease change for each review grade (permille). */
export function nextEasePermille(
  easePermille: number,
  rating: ReviewRating,
  config: AnkiSchedulerConfig = defaultAnkiSchedulerConfig
): number {
  const floor = config.easeMinimum;
  switch (rating) {
    case "again":
      return Math.max(floor, easePermille - 200);
    case "hard":
      return Math.max(floor, easePermille - 150);
    case "good":
      return easePermille;
    case "easy":
      return Math.max(floor, easePermille + 150);
    default: {
      const _exhaustive: never = rating;
      return _exhaustive;
    }
  }
}

export function lapseIntervalDays(
  previousIntervalDays: number,
  config: AnkiSchedulerConfig = defaultAnkiSchedulerConfig
): number {
  const i = Math.max(0, previousIntervalDays);
  const raw = config.lapseIntervalMultiplier * i;
  if (raw <= 0) {
    return config.minLapseIntervalDays;
  }
  return Math.max(config.minLapseIntervalDays, Math.round(raw));
}

export interface ReviewSchedulingInput {
  previousIntervalDays: number;
  /** Days after due date (0 if reviewed on or before due). */
  delayDays: number;
  easePermille: number;
  rating: ReviewRating;
}

export interface ReviewSchedulingResult {
  easePermille: number;
  intervalDays: number;
}

/**
 * Single step: given current scheduling state and a grade, returns new ease and interval (days).
 * Use this after a card is in the **review** state with a meaningful `previousIntervalDays`.
 */
export function scheduleNextReview(
  input: ReviewSchedulingInput,
  config: AnkiSchedulerConfig = defaultAnkiSchedulerConfig
): ReviewSchedulingResult {
  const { previousIntervalDays, delayDays, easePermille, rating } = input;
  const ease = nextEasePermille(easePermille, rating, config);

  if (rating === "again") {
    return {
      easePermille: ease,
      intervalDays: lapseIntervalDays(previousIntervalDays, config),
    };
  }

  const { hard, good, easy } = computeCandidateIntervalsDays(
    previousIntervalDays,
    delayDays,
    easePermille,
    config
  );

  switch (rating) {
    case "hard":
      return { easePermille: ease, intervalDays: hard };
    case "good":
      return { easePermille: ease, intervalDays: good };
    case "easy":
      return { easePermille: ease, intervalDays: easy };
  }
}
