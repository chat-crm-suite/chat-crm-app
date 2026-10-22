import type { NotificationListResponse } from '@chat-crm/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { newQueryClient } from '@/features/settings/testing/fixtures'
import { notificationKeys } from './notification-cache'
import { readConversationNotices } from './read-conversation'
import { makeNotification } from './testing'

const mocks = vi.hoisted(() => ({ markConversationNotificationsRead: vi.fn() }))
vi.mock('./notifications.service', () => mocks)

const listKey = notificationKeys.list('c1')
const unreadKey = notificationKeys.unread('c1')

function cacheWith(
  items: NotificationListResponse['items'],
  unreadCount: number
) {
  const queryClient = newQueryClient()
  queryClient.setQueryData<NotificationListResponse>(listKey, {
    items,
    unreadCount,
    nextCursor: null,
  })
  queryClient.setQueryData(unreadKey, unreadCount)
  return queryClient
}

describe('readConversationNotices', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reads every unread notice of the chat at once, then takes the server count', async () => {
    mocks.markConversationNotificationsRead.mockResolvedValue(1)
    const queryClient = cacheWith(
      [
        makeNotification({ id: 'a', groupKey: 'conversation:conv-1' }),
        makeNotification({
          id: 'm',
          type: 'conversation_message',
          groupKey: 'conversation:conv-1',
        }),
        makeNotification({ id: 'x', groupKey: 'conversation:conv-2' }),
      ],
      3
    )

    const pending = readConversationNotices(queryClient, 'c1', 'conv-1')
    // Optimistic: the badge already dropped by two.
    expect(queryClient.getQueryData(unreadKey)).toBe(1)
    await pending

    const items =
      queryClient.getQueryData<NotificationListResponse>(listKey)?.items ?? []
    expect(items.filter((item) => !item.readAt).map((item) => item.id)).toEqual(
      ['x']
    )
    expect(mocks.markConversationNotificationsRead).toHaveBeenCalledWith(
      'conv-1'
    )
  })

  it('skips the request when the bell has nothing unread for that chat', async () => {
    const queryClient = cacheWith(
      [makeNotification({ id: 'x', groupKey: 'conversation:conv-2' })],
      1
    )

    await readConversationNotices(queryClient, 'c1', 'conv-1')

    expect(mocks.markConversationNotificationsRead).not.toHaveBeenCalled()
  })
})
