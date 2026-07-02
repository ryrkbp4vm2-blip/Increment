/**
 * Thin native layer over expo-notifications. All scheduling DECISIONS live in
 * src/game/notificationPlan.ts (pure, tested); this module only talks to the
 * OS. Every call is wrapped in try/catch — notifications are a nicety, and
 * environments without support (web, restricted Expo Go) must never crash
 * the game.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { PlannedNotification } from '../game/notificationPlan';

// Only relevant if a scheduled notification fires while the app is open
// (we cancel on foreground, so effectively never) — show nothing.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let channelReady = false;

async function ensureAndroidChannel(): Promise<void> {
  if (channelReady || Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  channelReady = true;
}

/** True if notification permission is granted, asking the user if needed. */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

/** Replace all scheduled notifications with the given plan. */
export async function scheduleNotifications(plans: PlannedNotification[]): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await ensureAndroidChannel();
    for (const plan of plans) {
      await Notifications.scheduleNotificationAsync({
        identifier: plan.id,
        content: { title: plan.title, body: plan.body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: plan.fireAt,
          ...(Platform.OS === 'android' ? { channelId: 'default' } : null),
        },
      });
    }
  } catch {
    // Unsupported environment (web, restricted Expo Go) — silently skip.
  }
}

/** Drop everything scheduled — called whenever the app comes to foreground. */
export async function cancelScheduledNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Unsupported environment — nothing to cancel.
  }
}
