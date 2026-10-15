import type { ChannelFilter } from '@chat-crm/contracts'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { useLiveSnapshot } from '../hooks/use-analytics-queries'
import { formatDecimal, formatDuration, formatInteger } from '../lib/format'

const TREND_META = {
  building: {
    label: 'Acumulándose',
    icon: TrendingUp,
    color: 'var(--sla-breach)',
  },
  draining: { label: 'Bajando', icon: TrendingDown, color: 'var(--sla-ok)' },
  stable: { label: 'Estable', icon: Minus, color: 'var(--muted-foreground)' },
} as const

/**
 * Little's law in one sentence: arrivals per hour × median wait = the queue
 * the floor should have. A queue sustained above it is building up.
 */
export function QueuePressure({
  channel = 'all',
}: {
  channel?: ChannelFilter
}) {
  const { data: snapshot } = useLiveSnapshot(channel)
  const pressure = snapshot?.queuePressure
  if (!pressure) return null

  if (pressure.meta.status !== 'ok' || pressure.expectedQueueLength === null) {
    return (
      <p className='text-muted-foreground text-sm'>
        Llegan {formatInteger(pressure.arrivalsPerHour)} por hora. La cola
        esperada se calcula cuando haya esperas registradas.
      </p>
    )
  }

  const trend = TREND_META[pressure.trend]
  const TrendIcon = trend.icon

  return (
    <div className='flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm'>
      <p className='text-muted-foreground'>
        Llegan{' '}
        <span className='text-foreground font-medium tabular-nums'>
          {formatDecimal(pressure.arrivalsPerHour)}/h
        </span>{' '}
        × espera mediana{' '}
        <span className='text-foreground font-medium tabular-nums'>
          {formatDuration(pressure.medianWaitSeconds)}
        </span>{' '}
        ⇒ cola esperada{' '}
        <span className='text-foreground font-medium tabular-nums'>
          {formatDecimal(pressure.expectedQueueLength)}
        </span>
        , hay{' '}
        <span className='text-foreground font-medium tabular-nums'>
          {pressure.observedQueueLength}
        </span>
      </p>
      <p
        className='inline-flex items-center gap-1.5 font-medium'
        style={{ color: trend.color }}
      >
        <TrendIcon className='size-4' aria-hidden />
        Cola: {trend.label.toLowerCase()}
      </p>
    </div>
  )
}
