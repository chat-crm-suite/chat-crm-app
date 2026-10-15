/**
 * Time copy and urgency tiers for a chat-list row.
 *
 * Urgency only earns color when the row actually encodes waiting (queue /
 * needs-response views). Inbox rows use the quiet tier: without a sender on
 * the list payload, an old timestamp does not prove the customer is waiting.
 */

export type UrgencyTier = 'quiet' | 'normal' | 'warning' | 'critical'

export const URGENCY_NORMAL_MS = 15 * 60_000
export const URGENCY_WARNING_MS = 30 * 60_000
export const URGENCY_CRITICAL_MS = 60 * 60_000

const MS_MINUTE = 60_000
const MS_HOUR = 60 * MS_MINUTE
const MS_DAY = 24 * MS_HOUR

const weekday = new Intl.DateTimeFormat('es-PE', { weekday: 'short' })
const fullStamp = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'short',
  timeStyle: 'short',
})

function toMs(at: Date | string | number): number {
  return at instanceof Date ? at.getTime() : new Date(at).getTime()
}

/** How overdue the row is: quiet <15m, normal <30m, warning <60m, critical beyond. */
export function urgencyTier(
  at: Date | string | number,
  now: number
): UrgencyTier {
  const age = now - toMs(at)
  if (age >= URGENCY_CRITICAL_MS) return 'critical'
  if (age >= URGENCY_WARNING_MS) return 'warning'
  if (age >= URGENCY_NORMAL_MS) return 'normal'
  return 'quiet'
}

/** Age of a timestamp as list copy: `ahora`, `5m`, `2h`, `ayer`, `lun`, `28/9`. */
export function formatRelativeTime(
  at: Date | string | number,
  now: number
): string {
  const ms = toMs(at)
  const age = now - ms

  if (age < MS_MINUTE) return 'ahora'
  if (age < MS_HOUR) return `${Math.floor(age / MS_MINUTE)}m`
  if (age < MS_DAY) return `${Math.floor(age / MS_HOUR)}h`

  const date = new Date(ms)
  const today = new Date(now)
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime()
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ).getTime()
  const days = Math.round((startOfToday - startOfDate) / MS_DAY)

  if (days === 1) return 'ayer'
  if (days < 7) return weekday.format(date).replace('.', '')

  return `${date.getDate()}/${date.getMonth() + 1}`
}

/** Waiting copy for queue/needs-response rows: `espera 1m`, `espera 2h`, `espera 3d`. */
export function formatWaitingTime(
  at: Date | string | number,
  now: number
): string {
  const age = Math.max(0, now - toMs(at))

  if (age < MS_MINUTE) return 'espera 1m'
  if (age < MS_HOUR) return `espera ${Math.floor(age / MS_MINUTE)}m`
  if (age < MS_DAY) return `espera ${Math.floor(age / MS_HOUR)}h`

  return `espera ${Math.floor(age / MS_DAY)}d`
}

/** Full timestamp for a `title` tooltip, e.g. `07/10/26, 14:32`. */
export function formatFullStamp(at: Date | string | number): string {
  return fullStamp.format(toMs(at))
}
