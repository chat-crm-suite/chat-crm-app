import { parsePhoneNumber } from 'react-phone-number-input'

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

/** Phone in international format when parseable, raw value otherwise. */
export function formatPhone(phone?: string | null): string | undefined {
  if (!phone) return undefined

  return parsePhoneNumber(phone, 'PE')?.formatInternational() || phone
}

/**
 * Short case identifier for the header (`#4821` style). Derived from the
 * conversation id with FNV-1a and folded into 1000-9999, so it is stable per
 * conversation, always four digits and needs no API field.
 */
export function shortConversationId(id: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return String(((hash >>> 0) % 9000) + 1000)
}
