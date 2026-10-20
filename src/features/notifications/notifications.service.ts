import {
  NotificationListResponseSchema,
  NotificationUnreadCountSchema,
  type NotificationListQuery,
  type NotificationListResponse,
} from '@chat-crm/contracts'
import { parseContract } from '@/lib/contract-parse'
import { client } from '@/lib/http'

const notifications = client('/notifications')

/** Latest activity first; `after` = what changed since a row (replay). */
export const listNotifications = async (
  query: Partial<NotificationListQuery> = {}
): Promise<NotificationListResponse> => {
  const { data } = await notifications.get('', { params: query })
  return parseContract(NotificationListResponseSchema, data)
}

export const getUnreadCount = async (): Promise<number> => {
  const { data } = await notifications.get('/unread-count')
  return parseContract(NotificationUnreadCountSchema, data).unreadCount
}

export const markNotificationRead = async (id: string): Promise<number> => {
  const { data } = await notifications.post(`/${id}/read`)
  return parseContract(NotificationUnreadCountSchema, data).unreadCount
}

export const markAllNotificationsRead = async (): Promise<number> => {
  const { data } = await notifications.post('/read')
  return parseContract(NotificationUnreadCountSchema, data).unreadCount
}
