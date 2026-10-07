import type { ChatMessage } from '../types/chat.domain'

/**
 * WhatsApp customer service window: 24 h of free-form replies counted from the
 * customer's last inbound message. Outside it only approved templates can be
 * sent (template flow tracked in #10).
 */
export const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000

export type ServiceWindow =
  { kind: 'none' } | { kind: 'open'; remainingMs: number } | { kind: 'expired' }

/**
 * Window state of one conversation, derived from its thread. The window opens
 * with the customer's first message and restarts with every new one, so only
 * the newest `customer` message counts. `none` means the customer has not
 * written yet: there is no window to count down.
 */
export function serviceWindowState(
  messages: ChatMessage[],
  now: Date | number = Date.now()
): ServiceWindow {
  const nowMs = now instanceof Date ? now.getTime() : now

  let lastCustomerMs: number | undefined
  for (const message of messages) {
    if (message.sender.type !== 'customer') continue

    const timestamp = new Date(message.timestamp).getTime()
    if (lastCustomerMs === undefined || timestamp > lastCustomerMs) {
      lastCustomerMs = timestamp
    }
  }

  if (lastCustomerMs === undefined) return { kind: 'none' }

  const remainingMs = SERVICE_WINDOW_MS - (nowMs - lastCustomerMs)

  return remainingMs > 0 ? { kind: 'open', remainingMs } : { kind: 'expired' }
}

/** Human copy of the remaining window, e.g. `14 h 32 min` / `45 min`. */
export function formatServiceWindowRemaining(remainingMs: number): string {
  const totalMinutes = Math.ceil(remainingMs / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes} min`

  return `${hours} h ${String(minutes).padStart(2, '0')} min`
}
