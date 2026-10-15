import { useCallback, useEffect, useState } from 'react'

/**
 * Text size is a per-device accessibility preference. Everything in the app is
 * sized in rem, so scaling the root font size scales the whole interface.
 */
export const TEXT_SIZE_KEY = 'chat-crm:text-size'

export const TEXT_SIZES = ['normal', 'large', 'larger'] as const
export type TextSize = (typeof TEXT_SIZES)[number]

export const TEXT_SIZE_PERCENT: Record<TextSize, string> = {
  normal: '100%',
  large: '112.5%',
  larger: '125%',
}

export function readTextSize(): TextSize {
  try {
    const stored = localStorage.getItem(TEXT_SIZE_KEY)
    return TEXT_SIZES.includes(stored as TextSize)
      ? (stored as TextSize)
      : 'normal'
  } catch {
    return 'normal'
  }
}

export function applyTextSize(size: TextSize): void {
  document.documentElement.style.fontSize = TEXT_SIZE_PERCENT[size]
}

function writeTextSize(size: TextSize): void {
  try {
    localStorage.setItem(TEXT_SIZE_KEY, size)
  } catch {
    // Blocked storage: the choice lasts until the page is reloaded.
  }
}

/** Applies the saved size once, when the signed-in shell mounts. */
export function useApplySavedTextSize(): void {
  useEffect(() => {
    applyTextSize(readTextSize())
  }, [])
}

export function useTextSize() {
  const [size, setSizeState] = useState<TextSize>(readTextSize)

  const setSize = useCallback((next: TextSize) => {
    setSizeState(next)
    writeTextSize(next)
    applyTextSize(next)
  }, [])

  return { size, setSize }
}
