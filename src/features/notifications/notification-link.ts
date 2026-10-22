import type { NotificationItem } from '@chat-crm/contracts'

/** Where a notification takes you, and the label of its toast action. */
export type NotificationTarget =
  | { to: '/chats'; search: { conversation: string }; label: string }
  | { to: '/tasks'; label: string }
  | { to: '/settings/integrations/whatsapp'; label: string }
  | { to: '/'; label: string }

export function notificationTarget(
  notification: Pick<NotificationItem, 'type' | 'data'>
): NotificationTarget | null {
  const { type, data } = notification

  switch (type) {
    case 'conversation_assigned':
    case 'conversation_message':
    case 'queue_unassigned':
      return data.conversationId
        ? {
            to: '/chats',
            search: { conversation: data.conversationId },
            label: 'Abrir chat',
          }
        : null
    case 'task_assigned':
    case 'task_due':
      return { to: '/tasks', label: 'Ver tareas' }
    case 'channel_down':
      return { to: '/settings/integrations/whatsapp', label: 'Revisar canal' }
    case 'spend_budget':
    case 'ia_down':
      return { to: '/', label: 'Ver panel' }
  }
}

/** Title with the grouped count: "Chat sin asignar (3)". */
export function notificationTitle(
  notification: Pick<NotificationItem, 'title' | 'count'>
): string {
  return notification.count > 1
    ? `${notification.title} (${notification.count})`
    : notification.title
}
