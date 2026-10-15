/**
 * Per-browser notification preferences (sound + desktop alerts). They are not
 * stored on the server: each device decides how loud it is. Storage can be
 * blocked (private mode), so every access is wrapped and falls back to the
 * defaults.
 */
export const LOCAL_NOTIFICATION_PREFS_KEY = 'chat-crm:notification-prefs'

export type LocalNotificationPrefs = {
  /** Play a sound when a new notification arrives. */
  sound: boolean
  /** Show a desktop notification (also needs the browser permission). */
  desktop: boolean
}

export const DEFAULT_LOCAL_NOTIFICATION_PREFS: LocalNotificationPrefs = {
  sound: true,
  desktop: true,
}

export function readLocalNotificationPrefs(): LocalNotificationPrefs {
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFICATION_PREFS_KEY)
    if (!raw) return DEFAULT_LOCAL_NOTIFICATION_PREFS

    const parsed = JSON.parse(raw) as Partial<LocalNotificationPrefs>
    return {
      sound:
        typeof parsed.sound === 'boolean'
          ? parsed.sound
          : DEFAULT_LOCAL_NOTIFICATION_PREFS.sound,
      desktop:
        typeof parsed.desktop === 'boolean'
          ? parsed.desktop
          : DEFAULT_LOCAL_NOTIFICATION_PREFS.desktop,
    }
  } catch {
    return DEFAULT_LOCAL_NOTIFICATION_PREFS
  }
}

export function writeLocalNotificationPrefs(
  prefs: LocalNotificationPrefs
): void {
  try {
    localStorage.setItem(LOCAL_NOTIFICATION_PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Blocked storage: the choice only lasts for this page load.
  }
}

/** Browser notification permission, or `unsupported` without the API. */
export function desktopPermission():
  | NotificationPermission
  | 'unsupported' {
  return typeof Notification === 'undefined'
    ? 'unsupported'
    : Notification.permission
}

/** True when a desktop notification should actually be shown right now. */
export function shouldShowDesktopNotification(): boolean {
  return (
    readLocalNotificationPrefs().desktop && desktopPermission() === 'granted'
  )
}
