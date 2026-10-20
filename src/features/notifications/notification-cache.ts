import type { QueryClient } from '@tanstack/react-query'
import type {
  NotificationItem,
  NotificationListResponse,
} from '@chat-crm/contracts'

/**
 * Bell cache helpers. Keys carry the company so two companies never share a
 * list or a badge. Every write is idempotent: the same event twice (socket
 * redelivery, replay after reconnect) leaves the same cache.
 */
export const notificationKeys = {
  all: ['notifications'] as const,
  list: (companyId: string) => ['notifications', companyId, 'list'] as const,
  unread: (companyId: string) =>
    ['notifications', companyId, 'unread'] as const,
}

export const BELL_PAGE_SIZE = 20

/** Inserts or replaces by id, then re-sorts by latest activity. */
export function upsertNotifications(
  list: NotificationItem[],
  incoming: NotificationItem[]
): NotificationItem[] {
  const byId = new Map(list.map((item) => [item.id, item]))
  for (const item of incoming) {
    const current = byId.get(item.id)
    // Never let an older copy (late replay) overwrite a newer one.
    if (!current || current.updatedAt <= item.updatedAt) byId.set(item.id, item)
  }

  return [...byId.values()].sort((a, b) =>
    a.updatedAt === b.updatedAt
      ? b.id.localeCompare(a.id)
      : b.updatedAt.localeCompare(a.updatedAt)
  )
}

export function markReadInList(
  list: NotificationItem[],
  ids: string[] | 'all',
  readAt = new Date().toISOString()
): NotificationItem[] {
  return list.map((item) =>
    !item.readAt && (ids === 'all' || ids.includes(item.id))
      ? { ...item, readAt }
      : item
  )
}

/** Applies a live/replayed batch to one company's cached list and badge. */
export function applyToCache(
  queryClient: QueryClient,
  companyId: string,
  items: NotificationItem[],
  unreadCount: number
): void {
  queryClient.setQueryData<NotificationListResponse>(
    notificationKeys.list(companyId),
    (previous) =>
      previous
        ? {
            ...previous,
            items: upsertNotifications(previous.items, items),
            unreadCount,
          }
        : previous
  )
  queryClient.setQueryData(notificationKeys.unread(companyId), unreadCount)
}

export function applyReadToCache(
  queryClient: QueryClient,
  companyId: string,
  ids: string[] | 'all',
  unreadCount: number
): void {
  queryClient.setQueryData<NotificationListResponse>(
    notificationKeys.list(companyId),
    (previous) =>
      previous
        ? {
            ...previous,
            items: markReadInList(previous.items, ids),
            unreadCount,
          }
        : previous
  )
  queryClient.setQueryData(notificationKeys.unread(companyId), unreadCount)
}
