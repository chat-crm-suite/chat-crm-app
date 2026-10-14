import type { DurationSummary, Histogram } from '@chat-crm/contracts'
import { formatDuration } from '../lib/format'
import { SufficiencyNote } from './sufficiency-note'

type ResponseTimeSummaryProps = {
  summary: DurationSummary
  /** Anonymous team medians for the comparison line. */
  team?: { median: number | null; p90: number | null }
  histogram?: Histogram
  /** Completes the empty-state copy: `la primera respuesta`. */
  what: string
}

/**
 * Median and p90 instead of an average: response times are skewed, and one
 * eight-hour case would wreck a mean. The histogram uses log-spaced bins so
 * the long tail stays visible.
 */
export function ResponseTimeSummary({
  summary,
  team,
  histogram,
  what,
}: ResponseTimeSummaryProps) {
  if (summary.meta.status !== 'ok') {
    return <SufficiencyNote meta={summary.meta} unit='cases' what={what} />
  }

  return (
    <div className='space-y-3'>
      <dl className='grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1'>
        <dt className='text-muted-foreground text-sm'>Mediana</dt>
        <dd className='text-[28px] leading-tight font-semibold tabular-nums'>
          {formatDuration(summary.median)}
        </dd>
        <dt className='text-muted-foreground text-sm'>9 de cada 10</dt>
        <dd className='text-base tabular-nums'>
          en menos de {formatDuration(summary.p90)}
        </dd>
        {team && (
          <>
            <dt className='text-muted-foreground text-sm'>Equipo</dt>
            <dd className='text-muted-foreground text-sm tabular-nums'>
              mediana {formatDuration(team.median)} · 9 de 10 en{' '}
              {formatDuration(team.p90)}
            </dd>
          </>
        )}
      </dl>
      {histogram && histogram.meta.status === 'ok' && (
        <DurationHistogram histogram={histogram} />
      )}
    </div>
  )
}

/** Small bar histogram; each bar names its bin on hover and for readers. */
function DurationHistogram({ histogram }: { histogram: Histogram }) {
  const max = Math.max(1, ...histogram.bins.map((bin) => bin.count))
  const label = (from: number, to: number | null) =>
    to === null
      ? `más de ${formatDuration(from)}`
      : `${formatDuration(from)} a ${formatDuration(to)}`

  return (
    <figure className='space-y-1'>
      <div className='flex h-16 items-end gap-0.5' aria-hidden>
        {histogram.bins.map((bin) => (
          <div
            key={bin.fromSeconds}
            className='bg-series-1 min-h-px flex-1 rounded-t-[4px]'
            style={{ height: `${(bin.count / max) * 100}%` }}
            title={`${label(bin.fromSeconds, bin.toSeconds)}: ${bin.count} casos`}
          />
        ))}
      </div>
      <figcaption className='text-muted-foreground flex justify-between text-xs'>
        <span>más rápido</span>
        <span>más lento (escala logarítmica)</span>
      </figcaption>
      <ul className='sr-only'>
        {histogram.bins.map((bin) => (
          <li key={bin.fromSeconds}>
            {label(bin.fromSeconds, bin.toSeconds)}: {bin.count} casos
          </li>
        ))}
      </ul>
    </figure>
  )
}
