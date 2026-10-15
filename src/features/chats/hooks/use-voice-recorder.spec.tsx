import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pickVoiceMimeType, useVoiceRecorder } from './use-voice-recorder'

/** Chrome-like recorder: WebM/Opus only, emits one chunk on stop. */
class FakeMediaRecorder {
  static isTypeSupported = (mime: string) => mime.startsWith('audio/webm')
  state: 'inactive' | 'recording' | 'paused' = 'inactive'
  mimeType: string
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null

  constructor(_stream: unknown, options: { mimeType: string }) {
    this.mimeType = options.mimeType
  }
  start() {
    this.state = 'recording'
  }
  pause() {
    this.state = 'paused'
  }
  resume() {
    this.state = 'recording'
  }
  stop() {
    this.ondataavailable?.({ data: new Blob(['opus-bytes']) })
    this.state = 'inactive'
    this.onstop?.()
  }
}

const track = { stop: vi.fn() }
const getUserMedia = vi.fn()

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  })
  getUserMedia.mockResolvedValue({ getTracks: () => [track] })
  track.stop.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useVoiceRecorder', () => {
  it('prefers the containers WhatsApp can take as a voice note', () => {
    expect(pickVoiceMimeType()).toBe('audio/webm;codecs=opus')
  })

  it('records, measures pauses out and hands over a file', async () => {
    const { result } = renderHook(() => useVoiceRecorder())

    await act(() => result.current.start())
    expect(result.current.state).toBe('recording')

    act(() => vi.advanceTimersByTime(3000))
    expect(result.current.elapsedMs).toBeGreaterThanOrEqual(2800)

    act(() => result.current.pause())
    act(() => vi.advanceTimersByTime(10_000))
    act(() => result.current.resume())
    act(() => vi.advanceTimersByTime(1000))

    let note: Awaited<ReturnType<typeof result.current.finish>> = null
    await act(async () => {
      note = await result.current.finish()
    })

    expect(note).not.toBeNull()
    const { file, durationMs } = note as unknown as { file: File; durationMs: number }
    // The 10 s pause does not count.
    expect(durationMs).toBe(4000)
    expect(file.type).toBe('audio/webm;codecs=opus')
    expect(file.name).toMatch(/^nota-de-voz-.*\.webm$/)
    expect(track.stop).toHaveBeenCalled()
    expect(result.current.state).toBe('idle')
  })

  it('discards a cancelled recording and releases the microphone', async () => {
    const { result } = renderHook(() => useVoiceRecorder())

    await act(() => result.current.start())
    act(() => result.current.cancel())

    expect(result.current.state).toBe('idle')
    expect(track.stop).toHaveBeenCalled()
    await expect(result.current.finish()).resolves.toBeNull()
  })

  it('reports a refused microphone', async () => {
    getUserMedia.mockRejectedValue(new DOMException('denied', 'NotAllowedError'))
    const { result } = renderHook(() => useVoiceRecorder())

    await act(() => result.current.start())

    expect(result.current.state).toBe('denied')
  })

  it('never keeps the microphone open after the composer goes away', async () => {
    const { result, unmount } = renderHook(() => useVoiceRecorder())
    await act(() => result.current.start())

    unmount()

    expect(track.stop).toHaveBeenCalled()
  })
})
