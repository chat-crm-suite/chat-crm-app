import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LOCAL_NOTIFICATION_PREFS_KEY } from '@/lib/local-notification-prefs'
import { newQueryClient } from '../testing/fixtures'
import {
  NOTIFICATION_PREFS_KEY,
  NotificationsForm,
} from './notifications-form'

const mocks = vi.hoisted(() => ({
  getNotificationPreferences: vi.fn(),
  saveNotificationPreferences: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/services/notification-preferences.service', () => ({
  getNotificationPreferences: mocks.getNotificationPreferences,
  saveNotificationPreferences: mocks.saveNotificationPreferences,
}))
vi.mock('sonner', () => ({ toast: mocks.toast }))

function renderForm() {
  const queryClient = newQueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <NotificationsForm />
    </QueryClientProvider>
  )
  return queryClient
}

const toggle = (name: string) =>
  screen.findByRole('switch', { name }, { timeout: 4000 })

function stubNotification(permission: NotificationPermission) {
  const requestPermission = vi.fn(async () => permission)
  vi.stubGlobal(
    'Notification',
    Object.assign(vi.fn(), { permission: 'default', requestPermission })
  )
  return requestPermission
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  window.localStorage.clear()
  mocks.getNotificationPreferences.mockResolvedValue({ muted: [] })
})

describe('NotificationsForm: server preferences', () => {
  it('shows one switch per notification type, on unless muted', async () => {
    mocks.getNotificationPreferences.mockResolvedValue({
      muted: ['queue_unassigned'],
    })
    renderForm()

    expect(await toggle('Conversación asignada')).toBeChecked()
    expect(await toggle('Conversaciones sin responsable')).not.toBeChecked()
    expect(await toggle('Presupuesto de mensajes')).toBeChecked()
  })

  it('flips the switch first and saves the muted list', async () => {
    const user = userEvent.setup()
    let finish: (value: unknown) => void = () => undefined
    mocks.saveNotificationPreferences.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      })
    )
    renderForm()

    await user.click(await toggle('Conversación asignada'))

    // Optimistic: already off while the request is still in flight.
    expect(await toggle('Conversación asignada')).not.toBeChecked()
    expect(mocks.saveNotificationPreferences).toHaveBeenCalledWith({
      muted: ['conversation_assigned'],
    })

    finish({ muted: ['conversation_assigned'] })
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Conversación asignada' })).not.toBeChecked()
    )
  })

  it('keeps the contract order when several types are muted', async () => {
    const user = userEvent.setup()
    mocks.saveNotificationPreferences.mockImplementation(async (value) => value)
    renderForm()

    await user.click(await toggle('Presupuesto de mensajes'))
    await user.click(await toggle('Conversación asignada'))

    await waitFor(() =>
      expect(mocks.saveNotificationPreferences).toHaveBeenLastCalledWith({
        muted: ['conversation_assigned', 'spend_budget'],
      })
    )
  })

  it('puts the switch back and says so when saving fails', async () => {
    const user = userEvent.setup()
    mocks.saveNotificationPreferences.mockRejectedValue(new Error('network'))
    const queryClient = renderForm()

    await user.click(await toggle('Conversación asignada'))

    await waitFor(() =>
      expect(mocks.toast.error).toHaveBeenCalledWith(
        'No se pudo guardar. Se restauró tu elección anterior.'
      )
    )
    expect(await toggle('Conversación asignada')).toBeChecked()
    expect(queryClient.getQueryData(NOTIFICATION_PREFS_KEY)).toEqual({ muted: [] })
  })

  it('offers a retry when the preferences cannot be loaded', async () => {
    const user = userEvent.setup()
    mocks.getNotificationPreferences.mockRejectedValueOnce(new Error('down'))
    renderForm()

    expect(
      await screen.findByText(/No se pudieron cargar tus avisos/)
    ).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await toggle('Conversación asignada')).toBeChecked()
  })
})

describe('NotificationsForm: this device', () => {
  const stored = () =>
    JSON.parse(window.localStorage.getItem(LOCAL_NOTIFICATION_PREFS_KEY) ?? '{}')

  it('remembers the sound preference in this browser', async () => {
    const user = userEvent.setup()
    stubNotification('default')
    renderForm()

    const sound = await toggle('Sonido con mensajes nuevos')
    expect(sound).toBeChecked()
    await user.click(sound)

    expect(sound).not.toBeChecked()
    expect(stored().sound).toBe(false)
  })

  it('asks the browser for permission before enabling desktop alerts', async () => {
    const user = userEvent.setup()
    const request = stubNotification('granted')
    renderForm()

    const desktop = await toggle('Avisos del escritorio')
    expect(desktop).not.toBeChecked()
    await user.click(desktop)

    await waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(desktop).toBeChecked())
    expect(stored().desktop).toBe(true)
  })

  it('stays off and explains when the browser denies the permission', async () => {
    const user = userEvent.setup()
    stubNotification('denied')
    renderForm()

    await user.click(await toggle('Avisos del escritorio'))

    await waitFor(() =>
      expect(mocks.toast.error).toHaveBeenCalledWith(
        expect.stringContaining('El navegador bloqueó los avisos')
      )
    )
    expect(await toggle('Avisos del escritorio')).not.toBeChecked()
  })

  it('disables desktop alerts where the browser has no Notification API', async () => {
    vi.stubGlobal('Notification', undefined)
    renderForm()

    const desktop = await toggle('Avisos del escritorio')
    expect(desktop).toBeDisabled()
    expect(
      screen.getByText('Este navegador no admite avisos del escritorio.')
    ).toBeVisible()
  })

  it('survives blocked storage', async () => {
    const user = userEvent.setup()
    stubNotification('default')
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    renderForm()

    const sound = await toggle('Sonido con mensajes nuevos')
    await user.click(sound)
    expect(sound).not.toBeChecked()
    vi.restoreAllMocks()
  })
})
