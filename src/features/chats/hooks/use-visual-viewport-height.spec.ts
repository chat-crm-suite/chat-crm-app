import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CHAT_VIEWPORT_HEIGHT_VAR,
  useVisualViewportHeight,
} from './use-visual-viewport-height'

/** Minimal `window.visualViewport` stub with working resize listeners. */
function stubVisualViewport(height: number, scale = 1) {
  const listeners = new Map<string, Set<() => void>>()
  const viewport = {
    height,
    scale,
    addEventListener: (type: string, listener: () => void) => {
      const set = listeners.get(type) ?? new Set()
      set.add(listener)
      listeners.set(type, set)
    },
    removeEventListener: (type: string, listener: () => void) => {
      listeners.get(type)?.delete(listener)
    },
  }

  vi.stubGlobal('visualViewport', viewport)

  return {
    setScale(nextScale: number) {
      viewport.scale = nextScale
    },
    resize(nextHeight: number) {
      viewport.height = nextHeight
      listeners.get('resize')?.forEach((listener) => listener())
    },
    scroll() {
      listeners.get('scroll')?.forEach((listener) => listener())
    },
    listenerCount() {
      return [...listeners.values()].reduce((total, set) => total + set.size, 0)
    },
  }
}

describe('useVisualViewportHeight', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    document.documentElement.style.removeProperty(CHAT_VIEWPORT_HEIGHT_VAR)
  })

  it('publishes the visual viewport height as a CSS variable', () => {
    const viewport = stubVisualViewport(420)

    renderHook(() => useVisualViewportHeight())

    expect(
      document.documentElement.style.getPropertyValue(CHAT_VIEWPORT_HEIGHT_VAR)
    ).toBe('420px')

    viewport.resize(360)

    expect(
      document.documentElement.style.getPropertyValue(CHAT_VIEWPORT_HEIGHT_VAR)
    ).toBe('360px')

    viewport.scroll()

    expect(
      document.documentElement.style.getPropertyValue(CHAT_VIEWPORT_HEIGHT_VAR)
    ).toBe('360px')
  })

  it('ignores the shrunk viewport while pinch-zoomed', () => {
    const viewport = stubVisualViewport(420)

    renderHook(() => useVisualViewportHeight())

    viewport.setScale(2)
    viewport.resize(210)

    expect(
      document.documentElement.style.getPropertyValue(CHAT_VIEWPORT_HEIGHT_VAR)
    ).toBe('420px')

    viewport.setScale(1)
    viewport.resize(210)

    expect(
      document.documentElement.style.getPropertyValue(CHAT_VIEWPORT_HEIGHT_VAR)
    ).toBe('210px')
  })

  it('cleans up the variable and its listeners on unmount', () => {
    const viewport = stubVisualViewport(500)
    const { unmount } = renderHook(() => useVisualViewportHeight())

    unmount()

    expect(viewport.listenerCount()).toBe(0)
    expect(
      document.documentElement.style.getPropertyValue(CHAT_VIEWPORT_HEIGHT_VAR)
    ).toBe('')
  })
})
