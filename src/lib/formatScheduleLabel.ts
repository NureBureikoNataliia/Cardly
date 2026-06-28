import type { ScheduleOutcome } from "@cardly/srs/cardScheduling";

import type { Locale } from "@/src/locales/translations";
import { translations } from "@/src/locales/translations";

function scheduleUnits(locale: Locale) {
  const dict = translations[locale] ?? translations.en;
  return {
    ltMin: dict.scheduleLtMin,
    min: dict.scheduleUnitMin,
    hour: dict.scheduleUnitHour,
    day: dict.scheduleUnitDay,
    month: dict.scheduleUnitMonth,
    year: dict.scheduleUnitYear,
  };
}

/** Short label for rating buttons (interval hints). */
export function formatScheduleLabel(outcome: ScheduleOutcome, locale: Locale = "en"): string {
  const u = scheduleUnits(locale);

  if (outcome.dueInSecondsFromNow != null) {
    const s = outcome.dueInSecondsFromNow;
    if (s < 60) return u.ltMin;
    if (s < 3600) return `${Math.max(1, Math.round(s / 60))}${u.min}`;
    if (s < 86_400) return `${Math.max(1, Math.round(s / 3600))}${u.hour}`;
    return `${(s / 86_400).toFixed(1)}${u.day}`;
  }
  const d = outcome.intervalDays;
  if (d <= 0) return `0${u.day}`;
  if (d < 30) return `${Math.round(d)}${u.day}`;
  if (d < 365) return `${(d / 30).toFixed(1)}${u.month}`;
  return `${(d / 365).toFixed(1)}${u.year}`;
}
