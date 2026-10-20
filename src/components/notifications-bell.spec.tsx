import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeNotification } from '@/features/notifications/testing'
import {
  makeUser,
  newQueryClient,
  signIn,
} from '@/features/settings/testing/fixtures'
import { NotificationBell } from './notifications-bell'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  listNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  toast: { error: vi.fn() },
}))

vi.mock('sonner', () => ({ toast: mocks.toast }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mocks.navigate }))
vi.mock('@/features/notifications/notifications.service', () => mocks)

const unread = makeNotification({ id: 'n1', title: 'Nuevo chat asignado' })
const grouped = makeNotification({
  id: 'n2',
  type: 'queue_unassigned',
  severity: 'warning',
  title: 'Chat sin asignar',
  groupKey: 'queue',
  count: 3,
  updatedAt: '2026-10-20T09:00:00.000Z',
  readAt: '2026-10-20T09:30:00.000Z',
})

function renderBell() {
  render(
    <QueryClientProvider client={newQueryClient()}>
      <NotificationBell />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  signIn(makeUser())
  vi.stubGlobal('Notification', { permission: 'granted' })
  mocks.listNotifications.mockResolvedValue({
    items: [unread, grouped],
    unreadCount: 1,
    nextCursor: null,
  })
  mocks.getUnreadCount.mockResolvedValue(1)
})

afterEach(() => vi.unstubAllGlobals())

describe('NotificationBell', () => {
  it('shows the server badge and grouped rows with their count', async () => {
    const user = userEvent.setup()
    renderBell()

    const trigger = await screen.findByRole('button', { name: /1 sin leer/ })
    await user.click(trigger)

    expect(await screen.findByText('Nuevo chat asignado')).toBeVisible()
    expect(screen.getByText('Chat sin asignar (3)')).toBeVisible()
  })

  it('opening an unread item marks it read on the server and navigates to it', async () => {
    const user = userEvent.setup()
    mocks.markNotificationRead.mockResolvedValue(0)
    renderBell()

    await user.click(await screen.findByRole('button', { name: /sin leer/ }))
    await user.click(await screen.findByText('Nuevo chat asignado'))

    expect(mocks.markNotificationRead).toHaveBeenCalledWith('n1')
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/chats',
      search: { conversation: 'conv-1' },
    })
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Abrir notificaciones' })
      ).toBeVisible()
    )
  })

  it('marks all read optimistically and rolls back with one toast if it fails', async () => {
    const user = userEvent.setup()
    mocks.markAllNotificationsRead.mockRejectedValue(new Error('down'))
    renderBell()

    await user.click(await screen.findByRole('button', { name: /sin leer/ }))
    await user.click(
      await screen.findByRole('button', { name: 'Marcar todas como leídas' })
    )

    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledTimes(1))
    expect(
      await screen.findByRole('button', { name: /1 sin leer/ })
    ).toBeVisible()
  })

  it('offers to enable OS notifications only while the permission is undecided', async () => {
    const user = userEvent.setup()
    const requestPermission = vi.fn(async () => 'granted' as const)
    vi.stubGlobal('Notification', { permission: 'default', requestPermission })
    renderBell()

    await user.click(await screen.findByRole('button', { name: /sin leer/ }))
    await user.click(
      screen.getByRole('button', { name: 'Activar avisos del sistema' })
    )

    expect(requestPermission).toHaveBeenCalledTimes(1)
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Activar avisos del sistema' })
      ).toBeNull()
    )
  })
})
