import { QueryClientProvider } from '@tanstack/react-query'
import { createFakeSocket } from '@/test/fake-socket'
import type { NotificationListResponse } from '@chat-crm/contracts'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  makeUser,
  newQueryClient,
  signIn,
} from '@/features/settings/testing/fixtures'
import { notificationKeys } from './notification-cache'
import { setOpenConversation } from './open-conversation'
import { makeNotification } from './testing'
import { useNotificationRealtime } from './use-notification-realtime'

const mocks = vi.hoisted(() => ({
  socket: null as unknown,
  navigate: vi.fn(),
  listNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markConversationNotificationsRead: vi.fn(),
  toast: {
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    dismiss: vi.fn(),
  },
}))

vi.mock('sonner', () => ({ toast: mocks.toast }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mocks.navigate }))
vi.mock('@/context/socket-provider', () => ({
  useSocket: () => ({ socket: mocks.socket, isConnected: true }),
}))
vi.mock('./notifications.service', () => ({
  listNotifications: mocks.listNotifications,
  getUnreadCount: mocks.getUnreadCount,
  markConversationNotificationsRead: mocks.markConversationNotificationsRead,
}))

class MockNotification {
  static permission: NotificationPermission = 'granted'
  static instances: MockNotification[] = []
  onclick: (() => void) | null = null
  close = vi.fn()
  title: string
  constructor(title: string) {
    this.title = title
    MockNotification.instances.push(this)
  }
}

const listKey = notificationKeys.list('c1')
const unreadKey = notificationKeys.unread('c1')

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', {
    value: state,
    configurable: true,
  })
}

function setup() {
  const fake = createFakeSocket()
  mocks.socket = fake.socket
  const queryClient = newQueryClient()
  const seed = makeNotification({
    id: 'seed',
    updatedAt: '2026-10-20T09:00:00.000Z',
    readAt: '2026-10-20T09:01:00.000Z',
  })
  queryClient.setQueryData<NotificationListResponse>(listKey, {
    items: [seed],
    unreadCount: 0,
    nextCursor: null,
  })
  queryClient.setQueryData(unreadKey, 0)
  renderHook(() => useNotificationRealtime(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })
  return { fake, queryClient }
}

beforeEach(() => {
  vi.clearAllMocks()
  signIn(makeUser())
  setVisibility('visible')
  MockNotification.instances = []
  vi.stubGlobal('Notification', MockNotification)
  vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(
    undefined
  )
  mocks.getUnreadCount.mockResolvedValue(0)
})

afterEach(() => {
  setOpenConversation(null)
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useNotificationRealtime', () => {
  it('visible tab: upserts the row, sets the server badge and shows one toast with an action', () => {
    const { fake, queryClient } = setup()
    const notification = makeNotification()

    act(() => fake.fire('notification:new', { notification, unreadCount: 4 }))

    expect(
      queryClient.getQueryData<NotificationListResponse>(listKey)?.items[0].id
    ).toBe(notification.id)
    expect(queryClient.getQueryData(unreadKey)).toBe(4)
    expect(mocks.toast.info).toHaveBeenCalledTimes(1)
    const [title, options] = mocks.toast.info.mock.calls[0] as [
      string,
      { id: string; action: { label: string; onClick: () => void } },
    ]
    expect(title).toBe('Nuevo chat asignado')
    expect(options.id).toBe(`notification:c1:${notification.id}`)

    options.action.onClick()
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/chats',
      search: { conversation: 'conv-1' },
    })
  })

  it('a duplicated delivery keeps one row and reuses the same toast id', () => {
    const { fake, queryClient } = setup()
    const event = { notification: makeNotification(), unreadCount: 1 }

    act(() => {
      fake.fire('notification:new', event)
      fake.fire('notification:new', event)
    })

    const items =
      queryClient.getQueryData<NotificationListResponse>(listKey)?.items ?? []
    expect(
      items.filter((item) => item.id === event.notification.id)
    ).toHaveLength(1)
    const ids = mocks.toast.info.mock.calls.map(
      ([, options]) => (options as { id: string }).id
    )
    expect(new Set(ids).size).toBe(1)
  })

  it('a grown group updates its toast (same id) with the count in the title', () => {
    const { fake } = setup()
    const grouped = makeNotification({
      type: 'queue_unassigned',
      severity: 'warning',
      title: 'Chat sin asignar',
      groupKey: 'queue',
    })

    act(() => {
      fake.fire('notification:new', { notification: grouped, unreadCount: 1 })
      fake.fire('notification:updated', {
        notification: {
          ...grouped,
          count: 2,
          updatedAt: '2026-10-20T10:01:00.000Z',
        },
        unreadCount: 1,
      })
    })

    expect(
      mocks.toast.warning.mock.calls.map(([title, options]) => [
        title,
        (options as { id: string }).id,
      ])
    ).toEqual([
      ['Chat sin asignar', 'notification:c1:queue'],
      ['Chat sin asignar (2)', 'notification:c1:queue'],
    ])
  })

  it('another company: updates that company badge, never interrupts here', () => {
    const { fake, queryClient } = setup()

    act(() =>
      fake.fire('notification:new', {
        notification: makeNotification({ companyId: 'c2' }),
        unreadCount: 7,
      })
    )

    expect(queryClient.getQueryData(notificationKeys.unread('c2'))).toBe(7)
    expect(mocks.toast.info).not.toHaveBeenCalled()
    expect(MockNotification.instances).toHaveLength(0)
  })

  it('hidden tab: one OS notification instead of a toast', async () => {
    const { fake } = setup()
    setVisibility('hidden')

    act(() =>
      fake.fire('notification:new', {
        notification: makeNotification(),
        unreadCount: 1,
      })
    )

    await waitFor(() => expect(MockNotification.instances).toHaveLength(1), {
      timeout: 2000,
    })
    expect(mocks.toast.info).not.toHaveBeenCalled()
  })

  it('ignores malformed payloads', () => {
    const { fake } = setup()

    act(() => fake.fire('notification:new', { id: 'legacy', title: 'x' }))

    expect(mocks.toast.info).not.toHaveBeenCalled()
  })

  it('notification:read from another tab marks rows and sets the badge', () => {
    const { fake, queryClient } = setup()
    const notification = makeNotification()
    act(() => fake.fire('notification:new', { notification, unreadCount: 1 }))

    act(() =>
      fake.fire('notification:read', {
        companyId: 'c1',
        ids: [notification.id],
        unreadCount: 0,
      })
    )

    const items =
      queryClient.getQueryData<NotificationListResponse>(listKey)?.items ?? []
    expect(
      items.find((item) => item.id === notification.id)?.readAt
    ).not.toBeNull()
    expect(queryClient.getQueryData(unreadKey)).toBe(0)
  })

  it('on reconnect replays what was missed since the newest cached row', async () => {
    const { fake, queryClient } = setup()
    const missed = makeNotification({
      id: 'missed',
      updatedAt: '2026-10-20T11:00:00.000Z',
    })
    mocks.listNotifications.mockResolvedValue({
      items: [missed],
      unreadCount: 1,
      nextCursor: null,
    })

    act(() => fake.fire('connect'))

    await waitFor(() => expect(queryClient.getQueryData(unreadKey)).toBe(1))
    expect(mocks.listNotifications).toHaveBeenCalledWith({
      after: 'seed',
      limit: 20,
    })
    expect(
      queryClient.getQueryData<NotificationListResponse>(listKey)?.items[0].id
    ).toBe('missed')
    // Replayed rows refresh the bell; they do not replay toasts.
    expect(mocks.toast.info).not.toHaveBeenCalled()
  })

  it('the chat on screen never toasts: its notice is read right away', async () => {
    const { fake, queryClient } = setup()
    mocks.markConversationNotificationsRead.mockResolvedValue(0)
    setOpenConversation('conv-1')
    const message = makeNotification({
      type: 'conversation_message',
      title: 'Ana',
      groupKey: 'conversation:conv-1',
    })

    act(() =>
      fake.fire('notification:new', { notification: message, unreadCount: 1 })
    )

    expect(mocks.toast.info).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(mocks.markConversationNotificationsRead).toHaveBeenCalledWith(
        'conv-1'
      )
    )
    expect(queryClient.getQueryData(unreadKey)).toBe(0)
  })

  it('another chat still toasts while one is open', () => {
    const { fake } = setup()
    setOpenConversation('conv-other')

    act(() =>
      fake.fire('notification:new', {
        notification: makeNotification({
          type: 'conversation_message',
          groupKey: 'conversation:conv-1',
        }),
        unreadCount: 1,
      })
    )

    expect(mocks.toast.info).toHaveBeenCalledTimes(1)
  })
})
