import { useEffect } from 'react';

import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { syncStudyDailyReminder } from '@/src/lib/studyReminderNotifications';

type NotifMeta = {
  studyReminder?: boolean;
  studyReminderHour?: number;
};

/**
 * Keeps the local daily “repeat words” notification in sync with account notification prefs.
 */
export function StudyReminderNotificationSync() {
  const { user } = useAuth();
  const { locale, t } = useLanguage();

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
    const enabled = raw?.studyReminder === true;
    const hour =
      typeof raw?.studyReminderHour === 'number' ? raw.studyReminderHour : 9;

    void syncStudyDailyReminder({
      enabled,
      hour,
      title: t('pushRepeatWordsTitle'),
      body: t('pushRepeatWordsBody'),
    });
  }, [user?.id, JSON.stringify(user?.user_metadata?.notifications), locale, t]);

  return null;
}
