import { Frown, Meh, Smile, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { ChatSentiment } from '../../types/chat.domain'
import { useToneMode, type ToneMode } from './tone-mode'

/**
 * Face per tone, colored with the theme tokens. Tone never shares a shape
 * with connection status (Wifi) or message ticks (checks).
 */
const TONE_META: Record<
  ChatSentiment['dominant'],
  { label: string; color: string; icon: LucideIcon }
> = {
  POS: { label: 'Positivo', color: 'var(--positive)', icon: Smile },
  NEU: { label: 'Neutral', color: 'var(--neutro)', icon: Meh },
  NEG: { label: 'Negativo', color: 'var(--negative)', icon: Frown },
}

const MODE_LABEL: Record<ToneMode, string> = {
  full: 'Completo',
  mini: 'Mini',
  off: 'Oculto',
}

function shares(sentiment: ChatSentiment) {
  return [
    { tone: 'POS', value: sentiment.avgPos },
    { tone: 'NEU', value: sentiment.avgNeu },
    { tone: 'NEG', value: sentiment.avgNeg },
  ] as const
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`
}

/** One stacked bar for the whole mix, instead of three separate meters. */
function ToneMeter({
  sentiment,
  className,
}: {
  sentiment: ChatSentiment
  className?: string
}) {
  return (
    <span
      role='img'
      aria-label={shares(sentiment)
        .map((part) => `${TONE_META[part.tone].label} ${percent(part.value)}`)
        .join(', ')}
      className={cn('flex h-1.5 w-12 gap-0.5', className)}
    >
      {shares(sentiment).map((part) => (
        <span
          key={part.tone}
          className='h-full min-w-1 rounded-full'
          style={{
            flexGrow: part.value,
            backgroundColor: TONE_META[part.tone].color,
          }}
        />
      ))}
    </span>
  )
}

/** Header badge: face, mix and detail popover. Hidden entirely in off mode. */
export function ToneControl({
  sentiment,
  className,
}: {
  sentiment?: ChatSentiment
  className?: string
}) {
  const [mode, setMode] = useToneMode()
  if (!sentiment || mode === 'off') return null

  const meta = TONE_META[sentiment.dominant]
  const Face = meta.icon

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className={cn('h-8 gap-1.5 rounded-full px-2.5', className)}
        >
          <Face
            className='size-4 shrink-0'
            style={{ color: meta.color }}
            aria-hidden
          />
          {mode === 'full' && (
            <span className='hidden text-xs font-medium sm:inline' aria-hidden>
              {meta.label}
            </span>
          )}
          <ToneMeter sentiment={sentiment} className='hidden sm:flex' />
          <span className='sr-only'>Tono {meta.label}. Ver detalle</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align='end' className='w-80'>
        <p className='text-muted-foreground mb-3 text-xs font-medium'>
          Análisis de sentimiento
        </p>

        <div className='flex items-center gap-3'>
          <span
            className='flex size-10 shrink-0 items-center justify-center rounded-full'
            style={{ backgroundColor: `color-mix(in oklch, ${meta.color} 14%, transparent)` }}
          >
            <Face className='size-5' style={{ color: meta.color }} aria-hidden />
          </span>
          <div className='min-w-0 flex-1'>
            <p className='text-sm font-semibold'>Tono {meta.label.toLowerCase()}</p>
            <p className='text-muted-foreground text-[11px]'>
              {sentiment.totalMessages} mensajes analizados
            </p>
          </div>
        </div>

        <ToneMeter sentiment={sentiment} className='mt-3 w-full' />

        <ul className='mt-3 space-y-1.5'>
          {shares(sentiment).map((part) => {
            const partMeta = TONE_META[part.tone]
            const Icon = partMeta.icon
            return (
              <li key={part.tone} className='flex items-center gap-2 text-xs'>
                <Icon
                  className='size-3.5 shrink-0'
                  style={{ color: partMeta.color }}
                  aria-hidden
                />
                <span className='flex-1'>{partMeta.label}</span>
                <span className='font-medium tabular-nums'>
                  {percent(part.value)}
                </span>
              </li>
            )
          })}
        </ul>

        <div className='mt-3 flex items-center justify-between gap-3 border-t pt-3'>
          <span className='text-muted-foreground text-xs font-medium'>
            Mostrar tono
          </span>
          <RadioGroup
            value={mode}
            onValueChange={(value) => setMode(value as ToneMode)}
            aria-label='Modo del tono'
            className='flex gap-3'
          >
            {(Object.keys(MODE_LABEL) as ToneMode[]).map((option) => {
              const id = `tone-mode-${option}`
              return (
                <div key={option} className='flex items-center gap-1.5'>
                  <RadioGroupItem value={option} id={id} />
                  <Label htmlFor={id} className='text-xs font-normal'>
                    {MODE_LABEL[option]}
                  </Label>
                </div>
              )
            })}
          </RadioGroup>
        </div>
      </PopoverContent>
    </Popover>
  )
}
