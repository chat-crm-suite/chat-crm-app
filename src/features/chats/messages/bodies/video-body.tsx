import { useRef, useState } from 'react'
import { Play, Video } from 'lucide-react'

import { MediaPlaceholder, UploadProgress } from '../media-placeholder'
import { mediaFrameStyle, mediaSource } from '../media-source'
import type { MessageBodyProps } from '../message-kind'
import { formatClock } from '../use-audio-player'
import { Caption } from './text-body'

/**
 * Video with a WhatsApp-like cover: first frame, a play button and the
 * length. The native controls (keyboard, fullscreen, PiP) appear only once
 * the agent starts it, so the thread stays clean.
 */
export function VideoBody({ view, message }: MessageBodyProps<'video'>) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [started, setStarted] = useState(false)
  const [loadedSeconds, setLoadedSeconds] = useState<number | null>(null)
  const source = mediaSource(message, view.media)

  if (source.state !== 'ready') {
    return (
      <div className='mt-1 w-72 max-w-full'>
        <MediaPlaceholder source={source} label='Video' />
        {view.caption && <Caption text={view.caption} />}
      </div>
    )
  }

  const seconds =
    view.media.durationMs != null ? view.media.durationMs / 1000 : loadedSeconds
  const label = view.caption ?? 'Video'

  const start = () => {
    setStarted(true)
    void videoRef.current?.play()?.catch(() => undefined)
  }

  return (
    <div className='mt-1 w-72 max-w-full'>
      <div
        className='relative w-full overflow-hidden rounded-xl border bg-black'
        style={
          mediaFrameStyle(view.media.width, view.media.height) ?? {
            aspectRatio: '16 / 9',
          }
        }
      >
        <video
          ref={videoRef}
          src={source.src}
          controls={started}
          preload='metadata'
          playsInline
          aria-label={label}
          onLoadedMetadata={(event) => {
            const { duration } = event.currentTarget
            if (Number.isFinite(duration)) setLoadedSeconds(duration)
          }}
          className='block size-full max-h-[26rem] object-contain'
        />

        {!started && !source.uploading && (
          <button
            type='button'
            onClick={start}
            aria-label={`Reproducir ${label.toLowerCase()}`}
            className='group/play focus-visible:ring-ring absolute inset-0 grid place-items-center bg-gradient-to-t from-black/50 via-transparent to-transparent focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset'
          >
            <span className='grid size-12 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-transform duration-150 motion-safe:group-hover/play:scale-105'>
              <Play className='size-5 translate-x-px fill-current' />
            </span>
            <span className='absolute start-2.5 bottom-2 flex items-center gap-1 text-[11px] font-medium text-white tabular-nums'>
              <Video aria-hidden className='size-3.5' />
              {seconds != null && formatClock(seconds)}
            </span>
          </button>
        )}

        {source.uploading && <UploadProgress progress={source.progress} />}
      </div>
      {view.caption && <Caption text={view.caption} />}
    </div>
  )
}
