import { Headphones, Mic, Pause, Play } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { MediaPlaceholder } from '../media-placeholder'
import { mediaSource } from '../media-source'
import type { MessageBodyProps } from '../message-kind'
import { formatClock, useAudioPlayer } from '../use-audio-player'

/**
 * Voice note / audio file player: play, scrub, elapsed or total time and
 * playback speed. The `<audio>` element stays native (no waveform decoding),
 * so long recordings cost nothing until played.
 */
export function AudioBody({ view, message }: MessageBodyProps<'audio'>) {
  const source = mediaSource(message, view.media)
  const player = useAudioPlayer(
    source.state === 'ready' ? source.src : null,
    view.media.durationMs
  )
  const label = view.voice ? 'Nota de voz' : 'Audio'
  const Icon = view.voice ? Mic : Headphones

  if (source.state !== 'ready') {
    return (
      <MediaPlaceholder source={source} label={label} className='mt-1 w-72 max-w-full' />
    )
  }

  const shown =
    player.isPlaying || player.currentTime > 0 ? player.currentTime : player.duration

  return (
    <div className='bg-muted/40 mt-1 flex w-72 max-w-full items-center gap-3 rounded-xl border p-2.5'>
      <audio ref={player.audioRef} src={source.src} preload='metadata' />
      <Button
        type='button'
        size='icon'
        onClick={player.toggle}
        disabled={source.uploading}
        aria-label={
          player.isPlaying
            ? `Pausar ${label.toLowerCase()}`
            : `Reproducir ${label.toLowerCase()}`
        }
        className='size-10 shrink-0 rounded-full max-sm:size-11'
      >
        {player.isPlaying ? (
          <Pause className='size-4 fill-current' />
        ) : (
          <Play className='size-4 translate-x-px fill-current' />
        )}
      </Button>

      <div className='flex min-w-0 flex-1 flex-col gap-2'>
        <Slider
          aria-label={`Posición de ${label.toLowerCase()}`}
          min={0}
          max={player.duration || 1}
          step={0.1}
          value={[Math.min(player.currentTime, player.duration || 1)]}
          onValueChange={([seconds]) => player.seek(seconds)}
          disabled={source.uploading || !player.duration}
          className='mt-1.5'
        />
        <div className='text-muted-foreground flex items-center justify-between gap-2 text-[11px] tabular-nums'>
          <span className='flex items-center gap-1'>
            <Icon
              aria-hidden
              className={cn('size-3.5', view.voice && 'text-primary')}
            />
            {formatClock(shown)}
          </span>
          {view.voice && (
            <button
              type='button'
              onClick={player.cycleRate}
              aria-label={`Velocidad ${player.rate}x`}
              className="bg-background text-foreground/80 hover:bg-background/70 focus-visible:ring-ring relative h-5 min-w-8 rounded-full border px-1.5 text-[10px] font-semibold focus-visible:ring-2 focus-visible:outline-none after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']"
            >
              {player.rate}×
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
