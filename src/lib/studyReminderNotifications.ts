import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  SchedulableTriggerInputTypes,
  type NotificationTriggerInput,
} from 'expo-notifications';

export const STUDY_DAILY_NOTIFICATION_ID = 'cardly-study-daily';
const ANDROID_STUDY_CHANNEL_ID = 'study-reminders';

let handlerRegistered = false;
let androidChannelEnsured = false;

function registerForegroundHandler() {
  if (handlerRegistered || Platform.OS === 'web') return;
  handlerRegistered = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidStudyChannel(): Promise<void> {
  if (Platform.OS !== 'android' || androidChannelEnsured) return;
  androidChannelEnsured = true;
  await Notifications.setNotificationChannelAsync(ANDROID_STUDY_CHANNEL_ID, {
    name: 'Study reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export type SyncStudyDailyReminderResult =
  | { ok: true }
  | { ok: false; reason: 'web' | 'permission_denied' | 'unavailable' };

/**
 * Local repeating daily notification (not remote push). iOS/Android only; web is a no-op.
 */
export async function syncStudyDailyReminder(options: {
  enabled: boolean;
  hour: number;
  title: string;
  body: string;
}): Promise<SyncStudyDailyReminderResult> {
  if (Platform.OS === 'web') {
    return { ok: false, reason: 'web' };
  }

  try {
    registerForegroundHandler();
    await Notifications.cancelScheduledNotificationAsync(STUDY_DAILY_NOTIFICATION_ID);
    if (!options.enabled) {
      return { ok: true };
    }

    await ensureAndroidStudyChannel();

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return { ok: false, reason: 'permission_denied' };
    }

    const hour = Math.max(0, Math.min(23, Math.floor(options.hour)));
    const trigger: NotificationTriggerInput = {
      type: SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_STUDY_CHANNEL_ID } : {}),
    };

    await Notifications.scheduleNotificationAsync({
      identifier: STUDY_DAILY_NOTIFICATION_ID,
      content: {
        title: options.title,
        body: options.body,
        sound: true,
        data: { kind: 'study-daily' },
      },
      trigger,
    });

    return { ok: true };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}
