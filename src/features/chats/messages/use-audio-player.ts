import { useCallback, useEffect, useRef, useState } from 'react'

export const PLAYBACK_RATES = [1, 1.5, 2] as const
export type PlaybackRate = (typeof PLAYBACK_RATES)[number]

/** Only one message plays at a time, like in WhatsApp. */
let playing: HTMLAudioElement | null = null

/**
 * State of one audio element for a custom player. Listeners follow `src`
 * (the element mounts once the file is available). `fallbackDurationMs`
 * covers browser recordings whose container reports an `Infinity` duration
 * until fully played (the API measures them when remuxing).
 */
export function useAudioPlayer(
  src: string | null,
  fallbackDurationMs: number | null
) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [mediaDuration, setMediaDuration] = useState<number | null>(null)
  const [rate, setRate] = useState<PlaybackRate>(1)

  const duration =
    mediaDuration && Number.isFinite(mediaDuration)
      ? mediaDuration
      : fallbackDurationMs
        ? fallbackDurationMs / 1000
        : 0

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTime = () => setCurrentTime(audio.currentTime)
    const onMeta = () => setMediaDuration(audio.duration)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('durationchange', onMeta)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('durationchange', onMeta)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      if (playing === audio) playing = null
    }
  }, [src])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (!audio.paused) {
      audio.pause()
      return
    }
    if (playing && playing !== audio) playing.pause()
    playing = audio
    void audio.play().catch(() => setIsPlaying(false))
  }, [])

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = seconds
    setCurrentTime(seconds)
  }, [])

  const cycleRate = useCallback(() => {
    setRate((current) => {
      const next =
        PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(current) + 1) % PLAYBACK_RATES.length]
      if (audioRef.current) audioRef.current.playbackRate = next
      return next
    })
  }, [])

  return { audioRef, isPlaying, currentTime, duration, rate, toggle, seek, cycleRate }
}

/** `65.4` → `1:05`. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
