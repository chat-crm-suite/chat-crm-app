import type { ChannelFilter } from '@chat-crm/contracts'
import { TONE_META } from '@/features/chats/components/conversation/tone-meta'
import {
  useSentimentAnalytics,
  type AnalyticsRange,
} from '../hooks/use-analytics-queries'
import { formatInteger, formatPercent } from '../lib/format'
import { ControlChart } from './control-chart'
import { SufficiencyNote } from './sufficiency-note'
import { WidgetSkeleton } from './widget'

type CustomerToneBreakdownProps = {
  range: AnalyticsRange & { channel: ChannelFilter }
  scope: 'company' | 'me'
  /** Supervisors/admins also get the negative-share control chart. */
  withControl?: boolean
}

const SEGMENTS = [
  { key: 'positive', tone: 'POS' },
  { key: 'neutral', tone: 'NEU' },
  { key: 'negative', tone: 'NEG' },
] as const

/**
 * Customer tone over the range as one stacked bar (2px gaps between
 * segments, a face + label per share so tone is never color-only).
 * Mount only while the sentiment IA is available.
 */
export function CustomerToneBreakdown({
  range,
  scope,
  withControl = false,
}: CustomerToneBreakdownProps) {
  const { data } = useSentimentAnalytics(range, scope)
  if (!data) return <WidgetSkeleton rows={2} />
  if (data.meta.status === 'empty') {
    return (
      <SufficiencyNote
        meta={data.meta}
        unit='messages'
        what='el tono de los clientes'
      />
    )
  }

  const total = data.days.reduce(
    (sum, day) => sum + day.positive + day.neutral + day.negative,
    0
  )

  return (
    <div className='space-y-4'>
      <div
        className='flex h-3 w-full gap-0.5 overflow-hidden rounded-full'
        aria-hidden
      >
        {SEGMENTS.map(({ key, tone }) => {
          const share = data.share[key] ?? 0
          return share > 0 ? (
            <span
              key={key}
              className='h-full first:rounded-s-full last:rounded-e-full'
              style={{
                width: `${share * 100}%`,
                backgroundColor: TONE_META[tone].color,
              }}
            />
          ) : null
        })}
      </div>
      <ul className='flex flex-wrap gap-x-6 gap-y-2 text-sm'>
        {SEGMENTS.map(({ key, tone }) => {
          const meta = TONE_META[tone]
          const Icon = meta.icon
          return (
            <li key={key} className='flex items-center gap-1.5'>
              <Icon
                className='size-4'
                style={{ color: meta.color }}
                aria-hidden
              />
              <span>{meta.label}</span>
              <span className='font-semibold tabular-nums'>
                {formatPercent(data.share[key])}
              </span>
            </li>
          )
        })}
        <li className='text-muted-foreground'>
          {formatInteger(total)} mensajes analizados
        </li>
      </ul>
      {withControl && (
        <div className='space-y-1'>
          <p className='text-sm font-medium'>Tono negativo por día</p>
          <ControlChart
            chart={data.negativeControl}
            kind='rate'
            label='Tono negativo'
          />
        </div>
      )}
    </div>
  )
}
