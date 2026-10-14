import { useEffect, useRef } from 'react'
import { Pause, Play, SendHorizontal, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Spinner } from '@/components/ui/spinner'
import type { VoiceRecorder } from '../../hooks/use-voice-recorder'
import { formatClock } from '../../messages/use-audio-player'

/**
 * Takes the composer's place while a voice note records, like WhatsApp:
 * discard, live timer, pause/resume and send. Escape discards.
 */
export function RecordingBar({
  recorder,
  onSend,
  disabled,
}: {
  recorder: VoiceRecorder
  onSend: () => void
  disabled: boolean
}) {
  const { state } = recorder
  const recording = state === 'recording'
  const requesting = state === 'requesting'
  const toggleRef = useRef<HTMLButtonElement>(null)

  // The mic button that started it is gone: keep keyboard focus in the bar.
  useEffect(() => {
    if (!requesting) toggleRef.current?.focus()
  }, [requesting])

  return (
    <div
      role='group'
      aria-label='Grabando nota de voz'
      className='border-input bg-background flex items-center gap-2 rounded-2xl border p-1.5'
      onKeyDown={(event) => {
        if (event.key === 'Escape') recorder.cancel()
      }}
    >
      <Button
        type='button'
        variant='ghost'
        size='icon'
        onClick={recorder.cancel}
        aria-label='Descartar nota de voz'
        className='text-destructive size-11 shrink-0 rounded-full sm:size-9'
      >
        <Trash2 className='size-[18px]' />
      </Button>

      <div className='flex min-w-0 flex-1 items-center gap-2 text-sm'>
        {requesting ? (
          <>
            <Spinner className='size-4' />
            <span className='text-muted-foreground'>Esperando el micrófono…</span>
          </>
        ) : (
          <>
            <span
              aria-hidden
              className={cn(
                'bg-destructive size-2.5 shrink-0 rounded-full',
                recording && 'motion-safe:animate-pulse',
                !recording && 'opacity-40'
              )}
            />
            <span role='timer' aria-live='off' className='font-medium tabular-nums'>
              {formatClock(recorder.elapsedMs / 1000)}
            </span>
            <span className='text-muted-foreground truncate'>
              {recording ? 'Grabando…' : 'En pausa'}
            </span>
            <span className='text-muted-foreground ms-auto hidden text-[11px] md:inline'>
              <Kbd>Esc</Kbd> descarta
            </span>
          </>
        )}
      </div>

      <Button
        ref={toggleRef}
        type='button'
        variant='ghost'
        size='icon'
        onClick={recording ? recorder.pause : recorder.resume}
        disabled={requesting}
        aria-label={recording ? 'Pausar grabación' : 'Continuar grabación'}
        className='size-11 shrink-0 rounded-full sm:size-9'
      >
        {recording ? <Pause className='size-[18px]' /> : <Play className='size-[18px]' />}
      </Button>
      <Button
        type='button'
        size='icon'
        onClick={onSend}
        disabled={disabled || requesting}
        aria-label='Enviar nota de voz'
        className='size-11 shrink-0 rounded-full sm:size-9'
      >
        <SendHorizontal className='size-4' />
      </Button>
    </div>
  )
}
