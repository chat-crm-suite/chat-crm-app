/**
 * Avatar identity for a chat-list row: a two-letter monogram plus a
 * deterministic tint bucket, so two customers sharing an initial do not look
 * alike. Everything is derived locally; no extra API data involved.
 */

export const AVATAR_TINTS = 8

/**
 * `María González` → `MG`; a single word uses its first two letters; without
 * a name the phone's last two digits keep the fallback distinguishable.
 */
export function customerInitials(customer: {
  displayName?: string | null
  phone?: string | null
}): string {
  const name = customer.displayName?.trim()

  if (name) {
    const words = name.split(/\s+/)
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase()
    }

    return words[0].slice(0, 2).toUpperCase()
  }

  const digits = customer.phone?.replace(/\D/g, '')
  if (digits?.length) return digits.slice(-2)

  return '?'
}

/** Deterministic tint bucket: the same key always lands on the same hue. */
export function tintIndex(key: string): number {
  let hash = 0

  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }

  return hash % AVATAR_TINTS
}
