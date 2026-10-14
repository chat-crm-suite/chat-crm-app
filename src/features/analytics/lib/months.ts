/** Last 12 calendar months, newest first, as `YYYY-MM`. */
export function recentMonths(now = new Date(), count = 12): string[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })
}
