/**
 * Number formatting for analytics copy. Every figure is rendered with
 * tabular numerals by the components; these helpers only build the strings.
 */
const LOCALE = 'es-419'

const percentFormat = new Intl.NumberFormat(LOCALE, {
  style: 'percent',
  maximumFractionDigits: 0,
})

const integerFormat = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 0,
})

const decimalFormat = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 1,
})

const usdFormat = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Rate unit price: keeps the 4 decimals Meta publishes. */
const unitPriceFormat = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
})

export const EMPTY_VALUE = '—'

export function formatPercent(rate: number | null | undefined): string {
  return rate == null ? EMPTY_VALUE : percentFormat.format(rate)
}

export function formatInteger(value: number | null | undefined): string {
  return value == null ? EMPTY_VALUE : integerFormat.format(value)
}

export function formatDecimal(value: number | null | undefined): string {
  return value == null ? EMPTY_VALUE : decimalFormat.format(value)
}

export function formatUsd(value: number | null | undefined): string {
  return value == null ? EMPTY_VALUE : usdFormat.format(value)
}

export function formatUnitPrice(value: number | null | undefined): string {
  return value == null ? EMPTY_VALUE : unitPriceFormat.format(value)
}

/**
 * Human duration for business-clock metrics: `45 s`, `2 min 10 s`,
 * `1 h 05 min`. Seconds are dropped from one hour up.
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return EMPTY_VALUE
  const total = Math.max(0, Math.round(seconds))
  if (total < 60) return `${total} s`
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hours > 0) return `${hours} h ${String(minutes).padStart(2, '0')} min`
  return secs === 0 ? `${minutes} min` : `${minutes} min ${secs} s`
}

/** Live wait as a stopwatch: `7:12`, `1:02:05`. */
export function formatClock(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return EMPTY_VALUE
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = String(total % 60).padStart(2, '0')
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}`
    : `${minutes}:${secs}`
}

/** Connected time in hours: `148 h`, `0,5 h`. */
export function formatHours(seconds: number | null | undefined): string {
  if (seconds == null) return EMPTY_VALUE
  const hours = seconds / 3600
  return `${hours < 10 ? decimalFormat.format(hours) : integerFormat.format(hours)} h`
}

const dayFormat = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
})

/** `YYYY-MM-DD` (company day) → `14 oct`. Parsed as a calendar date. */
export function formatDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return date
  return dayFormat.format(new Date(y, m - 1, d))
}

const monthFormat = new Intl.DateTimeFormat(LOCALE, {
  month: 'long',
  year: 'numeric',
})

/** `YYYY-MM` → `octubre de 2026`. */
export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  if (!y || !m) return month
  return monthFormat.format(new Date(y, m - 1, 1))
}

const hourFormat = new Intl.DateTimeFormat(LOCALE, {
  hour: 'numeric',
  minute: '2-digit',
})

export function formatHour(date: Date): string {
  return hourFormat.format(date)
}
