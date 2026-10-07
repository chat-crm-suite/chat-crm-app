import { cn } from '@/lib/utils'
import type { ChatSentiment } from '../../types/chat.domain'
import { percent, shares, TONE_META } from './tone-meta'

/** One stacked bar for the whole mix, instead of three separate meters. */
export function ToneMeter({
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

/**
 * Face, aggregate and mix shared by the header control and the case rail
 * (ADR-0003): both placements read the same sentiment aggregate and faces.
 */
export function ToneSummary({
  sentiment,
  className,
}: {
  sentiment: ChatSentiment
  className?: string
}) {
  const meta = TONE_META[sentiment.dominant]
  const Face = meta.icon

  return (
    <div className={cn('space-y-3', className)}>
      <div className='flex items-center gap-3'>
        <span
          className='flex size-10 shrink-0 items-center justify-center rounded-full'
          style={{
            backgroundColor: `color-mix(in oklch, ${meta.color} 14%, transparent)`,
          }}
        >
          <Face className='size-5' style={{ color: meta.color }} aria-hidden />
        </span>
        <div className='min-w-0 flex-1'>
          <p className='text-sm font-semibold'>
            Tono {meta.label.toLowerCase()}
          </p>
          <p className='text-muted-foreground text-[11px]'>
            {sentiment.totalMessages} mensajes analizados
          </p>
        </div>
      </div>

      <ToneMeter sentiment={sentiment} className='w-full' />

      <ul className='space-y-1.5'>
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
    </div>
  )
}
