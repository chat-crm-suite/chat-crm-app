import { useEffect } from 'react'

/**
 * CSS variable consumed by the mobile conversation surface. Declared as
 * `100dvh` in `index.css`, so it works even without the VisualViewport API.
 */
export const CHAT_VIEWPORT_HEIGHT_VAR = '--chat-viewport-height'

/**
 * Tracks `window.visualViewport` so the mobile conversation shrinks with the
 * virtual keyboard even where `dvh` does not follow it. Updates on resize and
 * scroll (iOS fires both while the keyboard opens) and cleans up on unmount.
 */
export function useVisualViewportHeight() {
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const root = document.documentElement
    const update = () => {
      // Pinch zoom shrinks the visual viewport without changing the layout:
      // ignore it so the surface does not relayout while zoomed.
      if (viewport.scale !== 1) return

      root.style.setProperty(
        CHAT_VIEWPORT_HEIGHT_VAR,
        `${Math.round(viewport.height)}px`
      )
    }

    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)

    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
      root.style.removeProperty(CHAT_VIEWPORT_HEIGHT_VAR)
    }
  }, [])
}
