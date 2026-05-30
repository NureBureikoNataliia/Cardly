import { Platform } from 'react-native';

export type StudyReminderPrefs = {
  enabled: boolean;
  hour: number;
};

export function localDateKey(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseStudyReminderPrefs(metadata: unknown): StudyReminderPrefs {
  const raw =
    metadata && typeof metadata === 'object' && 'notifications' in metadata
      ? (metadata as { notifications?: unknown }).notifications
      : metadata;

  if (!raw || typeof raw !== 'object') {
    return { enabled: false, hour: 9 };
  }

  const prefs = raw as Record<string, unknown>;
  const enabled =
    prefs.studyReminder === true || prefs.studyReminder === 'true' || prefs.studyReminder === 1;
  const hourRaw = prefs.studyReminderHour;
  const hourNum = typeof hourRaw === 'number' ? hourRaw : Number(hourRaw);
  const hour = Number.isFinite(hourNum)
    ? Math.max(0, Math.min(23, Math.floor(hourNum)))
    : 9;

  return { enabled, hour };
}

export function webReminderHiddenStorageKey(
  userId: string,
  nowMs: number,
  reminderHour: number,
): string {
  return `cardly_web_study_reminder_hidden_${userId}_${localDateKey(new Date(nowMs))}_h${reminderHour}`;
}

export function isWebStudyReminderHidden(
  userId: string,
  nowMs: number,
  reminderHour: number,
): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return (
    window.localStorage.getItem(webReminderHiddenStorageKey(userId, nowMs, reminderHour)) === '1'
  );
}

export function hideWebStudyReminderForToday(
  userId: string,
  nowMs: number,
  reminderHour: number,
): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  window.localStorage.setItem(
    webReminderHiddenStorageKey(userId, nowMs, reminderHour),
    '1',
  );
}

/** True when local time is at or after the configured reminder hour today. */
export function isWebStudyReminderDueNow(
  nowMs: number,
  prefs: StudyReminderPrefs,
  hidden: boolean,
): boolean {
  if (!prefs.enabled || hidden) return false;
  const now = new Date(nowMs);
  return now.getHours() >= prefs.hour;
}

/** Ms until the next :00 at reminder hour (today), or a short poll if already past. */
export function msUntilNextReminderCheck(hour: number, nowMs: number): number {
  const now = new Date(nowMs);
  const target = new Date(now);
  target.setHours(hour, 0, 0, 0);
  if (now.getTime() >= target.getTime()) {
    return 15_000;
  }
  return Math.max(1_000, target.getTime() - now.getTime() + 300);
}
