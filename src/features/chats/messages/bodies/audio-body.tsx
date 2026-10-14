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
    return <MediaPlaceholder source={source} label={label} className='mt-1' />
  }

  const shown = player.isPlaying || player.currentTime > 0
    ? player.currentTime
    : player.duration

  return (
    <div className='bg-muted/40 mt-1 flex w-[min(20rem,100%)] flex-col gap-0.5 rounded-xl border px-2.5 pt-2 pb-1.5'>
      <audio ref={player.audioRef} src={source.src} preload='metadata' />
      <div className='flex items-center gap-2'>
        <span
          aria-hidden
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-full',
            view.voice ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
          )}
        >
          <Icon className='size-4' />
        </span>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={player.toggle}
          disabled={source.uploading}
          aria-label={player.isPlaying ? `Pausar ${label.toLowerCase()}` : `Reproducir ${label.toLowerCase()}`}
          className='size-9 shrink-0 rounded-full max-sm:size-11'
        >
          {player.isPlaying ? <Pause className='size-5' /> : <Play className='size-5' />}
        </Button>
        <Slider
          aria-label={`Posición de ${label.toLowerCase()}`}
          min={0}
          max={player.duration || 1}
          step={0.1}
          value={[Math.min(player.currentTime, player.duration || 1)]}
          onValueChange={([seconds]) => player.seek(seconds)}
          disabled={source.uploading || !player.duration}
          className='min-w-0 flex-1'
        />
        {view.voice && (
          <button
            type='button'
            onClick={player.cycleRate}
            aria-label={`Velocidad ${player.rate}x`}
            className="bg-background text-foreground/80 hover:bg-background/70 focus-visible:ring-ring relative h-6 min-w-9 shrink-0 rounded-full px-1.5 text-[11px] font-semibold tabular-nums focus-visible:ring-2 focus-visible:outline-none after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-['']"
          >
            {player.rate}×
          </button>
        )}
      </div>
      <span className='text-muted-foreground ps-[5.5rem] text-[11px] tabular-nums'>
        {formatClock(shown)}
      </span>
    </div>
  )
}
