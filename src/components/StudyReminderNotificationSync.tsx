import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { syncStudyDailyReminder } from '@/src/lib/studyReminderNotifications';

type NotifMeta = {
  studyReminder?: boolean;
  studyReminderHour?: number;
};

function runSync(
  raw: NotifMeta | undefined,
  t: (key: string) => string,
) {
  const enabled = raw?.studyReminder === true;
  const hour =
    typeof raw?.studyReminderHour === 'number' ? raw.studyReminderHour : 9;

  void syncStudyDailyReminder({
    enabled,
    hour,
    title: t('pushRepeatWordsTitle'),
    body: t('pushRepeatWordsBody'),
  });
}

/**
 * Keeps the local daily “repeat words” notification in sync with account notification prefs.
 * Re-syncs when the app returns to foreground (Android may drop alarms until then).
 */
export function StudyReminderNotificationSync() {
  const { user } = useAuth();
  const { locale, t } = useLanguage();
  const metaKey = JSON.stringify(user?.user_metadata?.notifications);
  const lastAppState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!user) {
      void syncStudyDailyReminder({
        enabled: false,
        hour: 9,
        title: '',
        body: '',
      });
      return;
    }

    const raw = user.user_metadata?.notifications as NotifMeta | undefined;
    runSync(raw, t);
  }, [user?.id, metaKey, locale, t]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const prev = lastAppState.current;
      lastAppState.current = nextState;
      if (prev.match(/inactive|background/) && nextState === 'active' && user) {
        const raw = user.user_metadata?.notifications as NotifMeta | undefined;
        runSync(raw, t);
      }
    });
    return () => sub.remove();
  }, [user?.id, metaKey, locale, t]);

  return null;
}
