import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SocketProvider } from './socket-provider'

const mocks = vi.hoisted(() => {
  // Stable auth reference: a new object per selector call would re-run the
  // provider effect on every render (infinite reconnect loop).
  const auth = {
    user: { id: 'user-1', memberships: [] },
    company: { id: 'company-1' },
  }

  return {
    auth,
    io: vi.fn(),
    sendTemplate: vi.fn(),
    toast: Object.assign(vi.fn(), {
      info: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
    }),
  }
})

vi.mock('socket.io-client', () => ({ io: mocks.io }))
vi.mock('sonner', () => ({ toast: mocks.toast }))
vi.mock('@/services/whatsapp.service', () => ({
  sendTemplate: mocks.sendTemplate,
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (state: { auth: unknown }) => unknown) =>
    selector({ auth: mocks.auth }),
}))

class MockNotification {
  static permission: NotificationPermission = 'default'
  static requestPermission = vi.fn(() => Promise.resolve('granted'))
  static instances: MockNotification[] = []

  title: string
  options?: NotificationOptions

  constructor(title: string, options?: NotificationOptions) {
    this.title = title
    this.options = options
    MockNotification.instances.push(this)
  }
}

type Handler = (...args: unknown[]) => void

function createFakeSocket() {
  const listeners = new Map<string, Set<Handler>>()
  const socket = {
    on: vi.fn((event: string, handler: Handler) => {
      const handlers = listeners.get(event) ?? new Set<Handler>()
      handlers.add(handler)
      listeners.set(event, handlers)
    }),
    off: vi.fn(),
    close: vi.fn(),
    disconnect: vi.fn(),
  }

  const fire = (event: string, ...args: unknown[]) => {
    for (const handler of listeners.get(event) ?? []) handler(...args)
  }

  return { socket, fire }
}

function renderProvider() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const view = render(
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <div />
      </SocketProvider>
    </QueryClientProvider>
  )

  return { queryClient, ...view }
}

describe('SocketProvider', () => {
  let fake: ReturnType<typeof createFakeSocket>
  let playSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    fake = createFakeSocket()
    mocks.io.mockReturnValue(fake.socket)
    MockNotification.permission = 'default'
    MockNotification.requestPermission.mockClear()
    MockNotification.instances = []
    vi.stubGlobal('Notification', MockNotification)
    playSpy = vi
      .spyOn(window.HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests notification permission from an effect, once per mount', () => {
    const { rerender, queryClient } = renderProvider()

    rerender(
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <div />
        </SocketProvider>
      </QueryClientProvider>
    )

    expect(MockNotification.requestPermission).toHaveBeenCalledTimes(1)
  })

  it('does not request permission again when it is already granted', () => {
    MockNotification.permission = 'granted'

    renderProvider()

    expect(MockNotification.requestPermission).not.toHaveBeenCalled()
  })

  it('handles notification:new once: browser notification, cache, counter and a single toast', () => {
    MockNotification.permission = 'granted'
    const { queryClient } = renderProvider()
    const notification = {
      id: 'n-1',
      title: 'Nuevo chat asignado',
      body: 'Tenés un chat nuevo esperando respuesta',
    }

    act(() => fake.fire('notification:new', notification))

    expect(mocks.toast.info).toHaveBeenCalledTimes(1)
    expect(mocks.toast.info).toHaveBeenCalledWith('Nuevo chat asignado', {
      position: 'top-right',
      description: 'Tenés un chat nuevo esperando respuesta',
    })
    expect(queryClient.getQueryData(['notifications'])).toEqual([notification])
    expect(document.title).toBe('(1) Nuevo mensaje - MiApp')
    expect(MockNotification.instances).toHaveLength(1)
    expect(MockNotification.instances[0]).toMatchObject({
      title: 'Nuevo chat asignado',
      options: { body: 'Tenés un chat nuevo esperando respuesta' },
    })
    expect(playSpy).toHaveBeenCalledTimes(1)
  })

  it('shows the detail toast for a v2 message error without action', () => {
    renderProvider()

    act(() =>
      fake.fire('conversation:message:error', {
        code: 131047,
        title: 'Re-engagement message',
        message:
          'Message failed to send because more than 24 hours have passed',
        error_data: { details: 'Message failed to send' },
      })
    )

    expect(mocks.toast).toHaveBeenCalledWith('Re-engagement message', {
      position: 'top-right',
      description: 'Message failed to send',
      icon: expect.anything(),
    })
    expect(mocks.toast.error).not.toHaveBeenCalled()
  })

  it('offers the Enviar plantilla action when the error carries hasAction', () => {
    renderProvider()

    act(() =>
      fake.fire('conversation:message:error', {
        type: 'webhook_status_error',
        message: 'WhatsApp Webhook Status Error',
        hasAction: true,
        to: '+51999888777',
      })
    )

    expect(mocks.toast.error).toHaveBeenCalledTimes(1)
    const [title, options] = mocks.toast.error.mock.calls[0] as [
      string,
      {
        closeButton: boolean
        duration: number
        action: { label: string; onClick: () => void }
      },
    ]

    expect(title).toBe('webhook_status_error')
    expect(options).toMatchObject({
      closeButton: true,
      duration: Infinity,
      action: { label: 'Enviar plantilla' },
    })

    options.action.onClick()
    expect(mocks.sendTemplate).toHaveBeenCalledWith('+51999888777')
  })
})
