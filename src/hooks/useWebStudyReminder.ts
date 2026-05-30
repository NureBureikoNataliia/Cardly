import type { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import {
  hideWebStudyReminderForToday,
  isWebStudyReminderDueNow,
  isWebStudyReminderHidden,
  msUntilNextReminderCheck,
  parseStudyReminderPrefs,
} from '@/src/lib/webStudyReminder';

/**
 * Web-only clock for in-app study reminders (NotificationBell).
 * Polls on an interval, at the configured hour, and when the tab becomes visible.
 */
export function useWebStudyReminder(user: User | null) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [hidden, setHidden] = useState(false);
  const scheduleGenRef = useRef(0);

  const prefs = useMemo(
    () => parseStudyReminderPrefs(user?.user_metadata),
    [user?.user_metadata],
  );

  const refresh = useCallback(() => {
    const ts = Date.now();
    setNowMs(ts);
    if (Platform.OS !== 'web' || !user) {
      setHidden(false);
      return;
    }
    setHidden(isWebStudyReminderHidden(user.id, ts, prefs.hour));
  }, [prefs.hour, user]);

  const hideForToday = useCallback(() => {
    if (!user) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.sessionStorage.removeItem('cardly_web_test_study_reminder');
    }
    hideWebStudyReminderForToday(user.id, Date.now(), prefs.hour);
    setHidden(true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cardly-web-reminder-refresh'));
    }
  }, [prefs.hour, user]);

  useEffect(() => {
    refresh();
  }, [prefs.hour, refresh]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !user || typeof window === 'undefined') return;

    refresh();

    const intervalId = window.setInterval(refresh, 30_000);
    const gen = ++scheduleGenRef.current;
    let exactTimeoutId: ReturnType<typeof setTimeout> | undefined;

    const scheduleExactCheck = () => {
      if (gen !== scheduleGenRef.current || !prefs.enabled) return;
      const delay = msUntilNextReminderCheck(prefs.hour, Date.now());
      exactTimeoutId = window.setTimeout(() => {
        if (gen !== scheduleGenRef.current) return;
        refresh();
        scheduleExactCheck();
      }, delay);
    };

    scheduleExactCheck();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const onFocus = () => refresh();
    const onRefreshEvent = () => refresh();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    window.addEventListener('cardly-web-reminder-refresh', onRefreshEvent);

    return () => {
      scheduleGenRef.current += 1;
      window.clearInterval(intervalId);
      if (exactTimeoutId != null) window.clearTimeout(exactTimeoutId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('cardly-web-reminder-refresh', onRefreshEvent);
    };
  }, [prefs.enabled, prefs.hour, refresh, user?.id]);

  const forceTest =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    window.sessionStorage.getItem('cardly_web_test_study_reminder') === '1';

  const isDue =
    Platform.OS === 'web' &&
    Boolean(user) &&
    (forceTest || isWebStudyReminderDueNow(nowMs, prefs, hidden));

  return { isDue, hideForToday, prefs, refresh };
};
