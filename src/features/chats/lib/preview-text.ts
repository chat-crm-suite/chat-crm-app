/**
 * Hard character budget for a list preview, on top of the CSS truncation:
 * keeps the copy short and scannable even when the column is unusually wide.
 */
export const PREVIEW_MAX_CHARS = 56

/**
 * Shortens a list preview to `maxChars`. The cut lands on the last word
 * boundary when one sits past half the budget (no orphan two-letter stem) and
 * clips mid-word otherwise; the trailing `…` always reports hidden text.
 */
export function truncatePreview(
  text: string,
  maxChars = PREVIEW_MAX_CHARS
): string {
  const trimmed = text.trim()
  if (trimmed.length <= maxChars) return trimmed

  const cut = trimmed.slice(0, maxChars)
  const lastSpace = cut.lastIndexOf(' ')
  const stem =
    lastSpace >= Math.floor(maxChars / 2)
      ? cut.slice(0, lastSpace)
      : trimmed.slice(0, maxChars - 1)

  return `${stem.trimEnd()}…`
}
