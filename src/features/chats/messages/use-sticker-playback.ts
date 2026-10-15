import { useCallback, useEffect, useRef, useState } from 'react'

import { animatedWebpLoopMs } from '../lib/animated-webp'

/** Loops played each time a sticker comes into view or is touched. */
const PLAY_LOOPS = 3
/** Long stickers still stop after one loop past this. */
const MAX_PLAY_MS = 8000
const CACHE_LIMIT = 60

type Probe = { blob: Blob; loopMs: number } | null

/** Probed sticker files, shared by every row (a thread repeats stickers). */
const probes = new Map<string, Promise<Probe>>()

function probe(src: string): Promise<Probe> {
  const cached = probes.get(src)
  if (cached) return cached

  const pending = fetch(src, { credentials: 'include' })
    .then((response) => (response.ok ? response.blob() : null))
    .then(async (blob) => {
      if (!blob) return null
      const loopMs = animatedWebpLoopMs(new Uint8Array(await blob.arrayBuffer()))
      return loopMs ? { blob, loopMs } : null
    })
    .catch(() => null)

  probes.set(src, pending)
  if (probes.size > CACHE_LIMIT) probes.delete(probes.keys().next().value!)
  return pending
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * WhatsApp-like animated stickers: a few loops when the sticker enters the
 * view or is hovered/tapped, then it rests on a still frame. Browsers only
 * honour the file's own loop count (once, or forever), so each replay gets a
 * fresh object URL (restarts the animation) and the rest frame is a canvas
 * snapshot. Still stickers and unreadable files render as a plain image.
 */
export function useStickerPlayback(src: string) {
  const [state, setState] = useState<'probing' | 'still' | 'animated'>('probing')
  const [playUrl, setPlayUrl] = useState<string | null>(null)
  const containerRef = useRef<HTMLSpanElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const probeRef = useRef<Probe>(null)
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    let alive = true
    setState('probing')
    void probe(src).then((result) => {
      if (!alive) return
      probeRef.current = result
      setState(result ? 'animated' : 'still')
    })
    return () => {
      alive = false
    }
  }, [src])

  const draw = useCallback((image: CanvasImageSource) => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
  }, [])

  // Rest frame before the first play: the sticker's opening frame.
  useEffect(() => {
    const current = probeRef.current
    if (state !== 'animated' || !current) return
    const url = URL.createObjectURL(current.blob)
    const image = new Image()
    image.onload = () => draw(image)
    image.src = url
    return () => URL.revokeObjectURL(url)
  }, [state, draw])

  const stop = useCallback(() => {
    if (imageRef.current) draw(imageRef.current)
    setPlayUrl(null)
  }, [draw])

  const play = useCallback(() => {
    const current = probeRef.current
    if (!current || timerRef.current !== undefined) return
    setPlayUrl(URL.createObjectURL(current.blob))
    const loops = Math.max(1, Math.floor(MAX_PLAY_MS / current.loopMs))
    timerRef.current = window.setTimeout(
      () => {
        timerRef.current = undefined
        stop()
      },
      current.loopMs * Math.min(PLAY_LOOPS, loops)
    )
  }, [stop])

  // Play on entering the view (each time), unless motion is reduced.
  useEffect(() => {
    const element = containerRef.current
    if (state !== 'animated' || !element || prefersReducedMotion()) return
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => entry?.isIntersecting && play(),
      { threshold: 0.6 }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [state, play])

  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current)
      timerRef.current = undefined
    },
    []
  )
  // Each play owns its URL: released when it stops or the row unmounts.
  useEffect(() => () => void (playUrl && URL.revokeObjectURL(playUrl)), [playUrl])

  return { state, playUrl, play, containerRef, canvasRef, imageRef }
}
