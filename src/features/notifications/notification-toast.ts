import type { NotificationItem } from '@chat-crm/contracts'
import { notify, type NotifyOptions } from '@/lib/notify'
import { notificationTarget, notificationTitle } from './notification-link'

/**
 * One toast per notification group: a grouped row that grows updates the
 * toast already on screen ("Chat sin asignar (3)") instead of stacking.
 */
export function notificationToastId(notification: NotificationItem): string {
  return `notification:${notification.companyId}:${notification.groupKey ?? notification.id}`
}

export function showNotificationToast(
  notification: NotificationItem,
  open: (notification: NotificationItem) => void
): void {
  const target = notificationTarget(notification)
  const options: NotifyOptions = {
    id: notificationToastId(notification),
    description: notification.body ?? undefined,
    action: target
      ? { label: target.label, onClick: () => open(notification) }
      : undefined,
  }
  const title = notificationTitle(notification)

  switch (notification.severity) {
    case 'critical':
      notify.critical(title, options)
      break
    case 'warning':
      notify.warning(title, options)
      break
    case 'success':
      notify.success(title, options)
      break
    default:
      notify.info(title, options)
  }
}
