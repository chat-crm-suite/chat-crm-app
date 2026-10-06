import { vi } from 'vitest'

type Handler = (...args: unknown[]) => void

/**
 * Socket.io boundary stub shared by the socket specs: records listeners and
 * emits, and lets tests fire server events. `connected` mirrors the transport
 * state so the reconnect flows can be exercised.
 */
export function createFakeSocket(connected = true) {
  const listeners = new Map<string, Set<Handler>>()
  const socket = {
    connected,
    emit: vi.fn(),
    on: vi.fn((event: string, handler: Handler) => {
      const handlers = listeners.get(event) ?? new Set<Handler>()
      handlers.add(handler)
      listeners.set(event, handlers)
    }),
    off: vi.fn((event: string, handler: Handler) => {
      listeners.get(event)?.delete(handler)
    }),
    close: vi.fn(),
    disconnect: vi.fn(),
  }

  const fire = (event: string, ...args: unknown[]) => {
    for (const handler of listeners.get(event) ?? []) handler(...args)
  }

  return { socket, fire }
}

export type FakeSocket = ReturnType<typeof createFakeSocket>['socket']

/** Payloads emitted for one socket event, in emit order. */
export function emittedPayloads(socket: FakeSocket, event: string): unknown[] {
  return socket.emit.mock.calls
    .filter(([name]) => name === event)
    .map(([, payload]) => payload)
}
