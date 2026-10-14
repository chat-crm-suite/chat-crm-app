import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Containers in order of preference. WhatsApp plays Ogg/Opus as a voice note:
 * Firefox records it natively; Chrome/Edge record WebM/Opus, which the API
 * remuxes to Ogg without re-encoding; Safari falls back to MP4/AAC.
 */
export const VOICE_MIME_TYPES = [
  'audio/ogg;codecs=opus',
  'audio/webm;codecs=opus',
  'audio/mp4',
] as const

/** A voice note longer than this is closed automatically. */
export const MAX_RECORDING_MS = 15 * 60 * 1000

const TICK_MS = 200

export type RecorderState =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'paused'
  /** The browser or the user refused the microphone. */
  | 'denied'

export interface VoiceNote {
  file: File
  durationMs: number
}

const EXTENSIONS: Record<string, string> = {
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
}

export function pickVoiceMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  return VOICE_MIME_TYPES.find((mime) => MediaRecorder.isTypeSupported(mime)) ?? null
}

/** Whether this browser can record voice notes at all. */
export function canRecordVoice(): boolean {
  return !!navigator.mediaDevices?.getUserMedia && pickVoiceMimeType() !== null
}

/** Recorded time that survives pauses. */
class RecordingClock {
  private banked = 0
  private since: number | null = null
  private readonly now: () => number

  constructor(now: () => number = Date.now) {
    this.now = now
  }

  start() {
    this.banked = 0
    this.since = this.now()
  }
  pause() {
    this.banked = this.elapsed()
    this.since = null
  }
  resume() {
    this.since = this.now()
  }
  elapsed() {
    return this.banked + (this.since === null ? 0 : this.now() - this.since)
  }
}

/** Stops a recorder without keeping its data, and releases the microphone. */
function discard(media: MediaRecorder | null, stream: MediaStream | null) {
  if (media && media.state !== 'inactive') {
    media.ondataavailable = null
    media.stop()
  }
  stream?.getTracks().forEach((track) => track.stop())
}

/**
 * Records a voice note with the browser's own `MediaRecorder` (no library):
 * start, pause/resume, cancel or finish into a `File` plus its measured
 * duration. The microphone is released as soon as recording ends, and when
 * the composer goes away.
 */
export function useVoiceRecorder() {
  const [state, setState] = useState<RecorderState>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)

  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const chunks = useRef<Blob[]>([])
  const clock = useRef(new RecordingClock())

  const reset = useCallback((next: RecorderState = 'idle') => {
    recorder.current = null
    stream.current = null
    chunks.current = []
    setElapsedMs(0)
    setState(next)
  }, [])

  const start = useCallback(async () => {
    const mimeType = pickVoiceMimeType()
    if (!mimeType || recorder.current) return

    setState('requesting')
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      reset('denied')
      return
    }

    const media = new MediaRecorder(stream.current, { mimeType })
    media.ondataavailable = (event) => {
      if (event.data.size) chunks.current.push(event.data)
    }
    recorder.current = media
    media.start(250)
    clock.current.start()
    setElapsedMs(0)
    setState('recording')
  }, [reset])

  const pause = useCallback(() => {
    if (recorder.current?.state !== 'recording') return
    recorder.current.pause()
    clock.current.pause()
    setElapsedMs(clock.current.elapsed())
    setState('paused')
  }, [])

  const resume = useCallback(() => {
    if (recorder.current?.state !== 'paused') return
    recorder.current.resume()
    clock.current.resume()
    setState('recording')
  }, [])

  const cancel = useCallback(() => {
    discard(recorder.current, stream.current)
    reset()
  }, [reset])

  /** Stops and hands the recording over (null if nothing was captured). */
  const finish = useCallback(async (): Promise<VoiceNote | null> => {
    const media = recorder.current
    if (!media || media.state === 'inactive') return null

    const durationMs = clock.current.elapsed()
    const stopped = new Promise<void>((resolve) => {
      media.onstop = () => resolve()
    })
    media.stop()
    await stopped
    stream.current?.getTracks().forEach((track) => track.stop())

    const type = media.mimeType || 'audio/webm'
    const blob = new Blob(chunks.current, { type })
    reset()
    if (!blob.size) return null

    const extension = EXTENSIONS[type.split(';')[0]] ?? 'webm'
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    return {
      file: new File([blob], `nota-de-voz-${stamp}.${extension}`, { type }),
      durationMs,
    }
  }, [reset])

  // The visible timer, and the automatic stop at the maximum length.
  const onLimit = useRef(finish)
  useEffect(() => {
    onLimit.current = finish
  }, [finish])
  useEffect(() => {
    if (state !== 'recording') return
    const id = setInterval(() => {
      const elapsed = clock.current.elapsed()
      setElapsedMs(elapsed)
      if (elapsed >= MAX_RECORDING_MS) void onLimit.current()
    }, TICK_MS)
    return () => clearInterval(id)
  }, [state])

  // Leaving the conversation never keeps the microphone open.
  useEffect(() => () => discard(recorder.current, stream.current), [])

  return {
    state,
    elapsedMs,
    start,
    pause,
    resume,
    cancel,
    finish,
    dismissDenied: useCallback(() => setState('idle'), []),
  }
}

export type VoiceRecorder = ReturnType<typeof useVoiceRecorder>
