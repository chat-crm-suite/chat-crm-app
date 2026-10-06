import { useEffect, useState } from 'react'

export const TONE_MODES = ['full', 'mini', 'off'] as const
export type ToneMode = (typeof TONE_MODES)[number]

/** Preference key shared by every tone placement. */
export const TONE_MODE_STORAGE_KEY = 'chat:tone-mode'

function isToneMode(value: string | null): value is ToneMode {
  return TONE_MODES.includes(value as ToneMode)
}

export function readToneMode(): ToneMode {
  const stored = localStorage.getItem(TONE_MODE_STORAGE_KEY)
  return isToneMode(stored) ? stored : 'full'
}

/** Tone display mode persisted in localStorage across reloads. */
export function useToneMode(): [ToneMode, (mode: ToneMode) => void] {
  const [mode, setMode] = useState<ToneMode>(readToneMode)

  useEffect(() => {
    localStorage.setItem(TONE_MODE_STORAGE_KEY, mode)
  }, [mode])

  return [mode, setMode]
}
