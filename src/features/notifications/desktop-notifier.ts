import type { NotificationItem } from '@chat-crm/contracts'
import { desktopPermission } from '@/lib/local-notification-prefs'
import { notificationTitle } from './notification-link'

/**
 * Asks for the OS notification permission. Only call it from a click: browsers
 * ignore (or penalize) prompts that are not a user gesture.
 */
export async function requestDesktopPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.requestPermission()
}

/**
 * OS notification, WhatsApp Web style: the `tag` is the group, so a burst of
 * the same chat replaces one notification ("Ana (3)") instead of piling up;
 * clicking focuses the app and opens the target.
 */
export function showDesktopNotification(
  notification: NotificationItem,
  onOpen: () => void
): Notification | null {
  if (desktopPermission() !== 'granted') return null

  try {
    const shown = new Notification(notificationTitle(notification), {
      body: notification.body ?? undefined,
      tag: notification.groupKey ?? notification.id,
      icon: '/favicon.svg',
      // A grown group should alert again, not update silently.
      renotify: true,
      silent: true, // the app plays its own sound (once, across tabs)
    } as NotificationOptions)

    shown.onclick = () => {
      window.focus()
      onOpen()
      shown.close()
    }

    return shown
  } catch {
    // Some platforms (Android Chrome) only allow notifications from a
    // service worker: the toast and the bell still have it.
    return null
  }
}
