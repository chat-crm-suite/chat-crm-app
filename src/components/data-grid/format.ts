/** Two letters out of a display name, or out of a fallback such as a phone. */
export function initialsOf(name?: string | null, fallback?: string | null) {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? []
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()

  const digits = fallback?.replace(/\D/g, '')
  return digits?.length ? digits.slice(-2) : '?'
}

const RELATIVE = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
]

/** "hace 3 días" / "ayer"; no date library needed. */
export function relativeTime(date: Date | string | number, now = Date.now()) {
  const seconds = Math.round((new Date(date).getTime() - now) / 1000)
  for (const [unit, size] of STEPS) {
    if (Math.abs(seconds) >= size) {
      return RELATIVE.format(Math.round(seconds / size), unit)
    }
  }
  return 'ahora'
}
