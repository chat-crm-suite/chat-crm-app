import { vi } from 'vitest'

type Handler = (...args: unknown[]) => void

/**
 * Socket.io boundary stub shared by the socket specs: records listeners and
 * emits, and lets tests fire server events. `connected` mirrors the transport
 * state so the reconnect flows can be exercised.
 */
export function createFakeSocket(connected = true) {
  const listeners = new Map<string, Set<Handler>>()
  const managerListeners = new Map<string, Set<Handler>>()
  /** Answer of `timeout(ms).emitWithAck(...)`; acknowledges by default. */
  let ack: (event: string, payload: unknown) => Promise<unknown> = () =>
    Promise.resolve({ ok: true })
  const socket = {
    connected,
    emit: vi.fn(),
    timeout: vi.fn(() => ({
      emitWithAck: (event: string, payload: unknown) => {
        // Recorded like a plain emit so `emittedPayloads` sees every send.
        socket.emit(event, payload)
        return ack(event, payload)
      },
    })),
    on: vi.fn((event: string, handler: Handler) => {
      const handlers = listeners.get(event) ?? new Set<Handler>()
      handlers.add(handler)
      listeners.set(event, handlers)
    }),
    off: vi.fn((event: string, handler: Handler) => {
      listeners.get(event)?.delete(handler)
    }),
    close: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    /** The Manager (`socket.io`): reconnection events live here. */
    io: {
      on: vi.fn((event: string, handler: Handler) => {
        const handlers = managerListeners.get(event) ?? new Set<Handler>()
        handlers.add(handler)
        managerListeners.set(event, handlers)
      }),
    },
  }

  const fire = (event: string, ...args: unknown[]) => {
    for (const handler of listeners.get(event) ?? []) handler(...args)
  }

  /** Fires a Manager event (`reconnect_attempt`, ...). */
  const fireManager = (event: string, ...args: unknown[]) => {
    for (const handler of managerListeners.get(event) ?? []) handler(...args)
  }

  /** Programs the acknowledgement the server answers next sends with. */
  const setAck = (next: (event: string, payload: unknown) => Promise<unknown>) => {
    ack = next
  }

  return { socket, fire, fireManager, setAck }
}

export type FakeSocket = ReturnType<typeof createFakeSocket>['socket']

/** Payloads emitted for one socket event, in emit order. */
export function emittedPayloads(socket: FakeSocket, event: string): unknown[] {
  return socket.emit.mock.calls
    .filter(([name]) => name === event)
    .map(([, payload]) => payload)
}
