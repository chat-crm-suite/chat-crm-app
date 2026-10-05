/**
 * Copies text to the clipboard. Returns whether the copy actually happened.
 *
 * `navigator.clipboard` only exists in secure contexts (HTTPS or localhost).
 * The production front is served over plain HTTP, so there it is `undefined`
 * and a bare `navigator.clipboard?.writeText()` silently copies nothing: the
 * user then pastes whatever was copied before. Fall back to a hidden textarea
 * and `execCommand('copy')`, which works on HTTP origins.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Permission denied or blocked by the browser: try the legacy path.
    }
  }

  return legacyCopy(text)
}

function legacyCopy(text: string): boolean {
  const previouslyFocused = document.activeElement as HTMLElement | null
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.cssText =
    'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none'
  document.body.appendChild(textarea)

  try {
    textarea.select()
    textarea.setSelectionRange(0, text.length)
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    document.body.removeChild(textarea)
    previouslyFocused?.focus?.()
  }
}
