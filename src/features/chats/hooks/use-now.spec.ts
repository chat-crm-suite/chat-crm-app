import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useNow } from './use-now'

describe('useNow', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the current time and re-samples it on the interval', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-06T12:00:00'))

    const { result } = renderHook(() => useNow(60_000))

    expect(result.current).toBe(new Date('2026-10-06T12:00:00').getTime())

    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(result.current).toBe(new Date('2026-10-06T12:01:00').getTime())
  })

  it('clears its interval on unmount', () => {
    vi.useFakeTimers()

    const { unmount } = renderHook(() => useNow(60_000))
    expect(vi.getTimerCount()).toBe(1)

    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })
})
