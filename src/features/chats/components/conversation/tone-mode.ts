import { useSyncExternalStore } from 'react'

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

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Writes the preference and notifies every placement, so switching the mode in
 * the header also updates the rail panel (ADR-0003: `off` hides it everywhere).
 */
export function writeToneMode(mode: ToneMode): void {
  localStorage.setItem(TONE_MODE_STORAGE_KEY, mode)
  for (const listener of listeners) listener()
}

/** Tone display mode persisted in localStorage and shared across placements. */
export function useToneMode(): [ToneMode, (mode: ToneMode) => void] {
  const mode = useSyncExternalStore(subscribe, readToneMode, readToneMode)

  return [mode, writeToneMode]
}
