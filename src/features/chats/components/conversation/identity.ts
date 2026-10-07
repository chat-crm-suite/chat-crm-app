import { formatPhone as formatPhoneShared } from '@/lib/phone'

/** Avatar initials: "Rosa Medina" -> "RM". */
export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/**
 * Null-tolerant wrapper over the shared formatter: international format when
 * the number is valid, raw value otherwise (a missing phone stays undefined).
 */
export function formatPhone(phone?: string | null): string | undefined {
  return phone ? formatPhoneShared(phone) : undefined
}

/**
 * Short case identifier for the header (`#4821` style). Derived from the
 * conversation id with FNV-1a and folded into 1000-9999, so it is stable per
 * conversation, always four digits and needs no API field. Display-only: the
 * fold trades uniqueness for brevity, so ids can collide across conversations.
 */
export function shortConversationId(id: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return String(((hash >>> 0) % 9000) + 1000)
}
