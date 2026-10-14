import { Headphones, Mic, Pause, Play } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { MediaPlaceholder } from '../media-placeholder'
import { mediaSource } from '../media-source'
import { MessageMeta } from '../message-meta'
import type { MessageBodyProps } from '../message-kind'
import { formatClock, useAudioPlayer } from '../use-audio-player'

/**
 * Voice note / audio file player: play, scrub, elapsed or total time and
 * playback speed. The `<audio>` element stays native (no waveform decoding),
 * so long recordings cost nothing until played.
 */
export function AudioBody({ view, message, isMine }: MessageBodyProps<'audio'>) {
  const source = mediaSource(message, view.media)
  const player = useAudioPlayer(
    source.state === 'ready' ? source.src : null,
    view.media.durationMs
  )
  const label = view.voice ? 'Nota de voz' : 'Audio'
  const Icon = view.voice ? Mic : Headphones

  if (source.state !== 'ready') {
    return <MediaPlaceholder source={source} label={label} className='m-1' />
  }

  const shown = player.isPlaying || player.currentTime > 0
    ? player.currentTime
    : player.duration

  return (
    <div className='flex w-[min(17rem,72vw)] flex-col gap-0.5 px-2 pt-2 pb-1'>
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
            className='bg-muted text-foreground/80 hover:bg-muted/70 focus-visible:ring-ring h-6 min-w-9 shrink-0 rounded-full px-1.5 text-[11px] font-semibold tabular-nums focus-visible:ring-2 focus-visible:outline-none'
          >
            {player.rate}×
          </button>
        )}
      </div>
      <div className='text-muted-foreground flex items-center justify-between ps-[5.5rem] text-[11px] tabular-nums'>
        <span>{formatClock(shown)}</span>
        <MessageMeta
          message={message}
          isMine={isMine}
          className='static float-none ms-0 mt-0'
        />
      </div>
    </div>
  )
}
