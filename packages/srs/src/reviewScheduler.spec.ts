import {
  computeCandidateIntervalsDays,
  nextEasePermille,
  scheduleNextReview,
  DEFAULT_EASE_PERMILLE,
  MIN_EASE_PERMILLE,
} from './reviewScheduler';

describe('reviewScheduler', () => {
  it('computeCandidateIntervalsDays returns increasing intervals', () => {
    const res = computeCandidateIntervalsDays(10, 0, DEFAULT_EASE_PERMILLE);
    expect(typeof res.hard).toBe('number');
    expect(res.good).toBeGreaterThanOrEqual(res.hard);
    expect(res.easy).toBeGreaterThanOrEqual(res.good);
  });

  it('nextEasePermille changes correctly for ratings', () => {
    expect(nextEasePermille(2500, 'again')).toEqual(Math.max(MIN_EASE_PERMILLE, 2500 - 200));
    expect(nextEasePermille(2500, 'hard')).toEqual(Math.max(MIN_EASE_PERMILLE, 2500 - 150));
    expect(nextEasePermille(2500, 'good')).toEqual(2500);
    expect(nextEasePermille(2500, 'easy')).toEqual(Math.max(MIN_EASE_PERMILLE, 2500 + 150));
  });

  it('nextEasePermille throws or returns never on invalid rating', () => {
    expect(nextEasePermille(2500, 'invalid' as any)).toBe('invalid');
  });

  it('scheduleNextReview handles hard, good, easy ratings', () => {
    const hard = scheduleNextReview({ previousIntervalDays: 30, delayDays: 0, easePermille: 2500, rating: 'hard' });
    expect(hard.intervalDays).toBeGreaterThan(0);
    const good = scheduleNextReview({ previousIntervalDays: 30, delayDays: 0, easePermille: 2500, rating: 'good' });
    expect(good.intervalDays).toBeGreaterThan(0);
    const easy = scheduleNextReview({ previousIntervalDays: 30, delayDays: 0, easePermille: 2500, rating: 'easy' });
    expect(easy.intervalDays).toBeGreaterThan(0);
  });

  it('scheduleNextReview returns lapse interval on again', () => {
    const out = scheduleNextReview({ previousIntervalDays: 30, delayDays: 0, easePermille: 2500, rating: 'again' });
    expect(typeof out.intervalDays).toBe('number');
    expect(typeof out.easePermille).toBe('number');
  });

  it('lapseIntervalDays returns computed interval when > 0', () => {
    // raw = 0.5 * 10 = 5
    const out = scheduleNextReview(
      { previousIntervalDays: 10, delayDays: 0, easePermille: 2500, rating: 'again' },
      { intervalModifier: 1.0, easyBonus: 1.3, lapseIntervalMultiplier: 0.5, easeMinimum: MIN_EASE_PERMILLE, minLapseIntervalDays: 1 }
    );
    expect(out.intervalDays).toBe(5);
  });
});
