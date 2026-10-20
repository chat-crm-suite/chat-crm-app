import type { QueryClient } from '@tanstack/react-query'
import {
  conversationGroupKey,
  type NotificationListResponse,
} from '@chat-crm/contracts'
import { applyReadToCache, notificationKeys } from './notification-cache'
import { markConversationNotificationsRead } from './notifications.service'

/**
 * The chat is on screen: its assignment and message notices are read. The
 * bell and badge change at once; the server confirms the count and echoes
 * the read to the other tabs. Skips the request when the loaded bell has
 * nothing unread for this chat (opening chats is frequent).
 */
export async function readConversationNotices(
  queryClient: QueryClient,
  companyId: string,
  conversationId: string
): Promise<void> {
  const list = queryClient.getQueryData<NotificationListResponse>(
    notificationKeys.list(companyId)
  )
  const groupKey = conversationGroupKey(conversationId)
  const ids = (list?.items ?? [])
    .filter((item) => !item.readAt && item.groupKey === groupKey)
    .map((item) => item.id)
  if (list && !ids.length) return

  if (ids.length) {
    const unread = queryClient.getQueryData<number>(
      notificationKeys.unread(companyId)
    )
    applyReadToCache(
      queryClient,
      companyId,
      ids,
      Math.max(0, (unread ?? list?.unreadCount ?? 0) - ids.length)
    )
  }

  try {
    const unreadCount = await markConversationNotificationsRead(conversationId)
    queryClient.setQueryData(notificationKeys.unread(companyId), unreadCount)
  } catch {
    void queryClient.invalidateQueries({
      queryKey: ['notifications', companyId],
    })
  }
}
