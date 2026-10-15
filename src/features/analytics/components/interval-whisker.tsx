import type { RateEstimate } from '@chat-crm/contracts'
import { cn } from '@/lib/utils'
import { formatPercent } from '../lib/format'

type IntervalWhiskerProps = {
  rate: RateEstimate
  /** Plot the empirical-Bayes adjusted rate instead of the raw one. */
  adjusted?: boolean
  /** Team reference (median), drawn as a diamond. */
  reference?: number | null
  className?: string
}

/**
 * A rate on a 0–100 % scale with its 95 % Wilson interval as a whisker: the
 * uncertainty is drawn, not hidden. Wide whiskers mean "few cases, don't
 * conclude yet"; overlapping whiskers mean no proven difference.
 */
export function IntervalWhisker({
  rate,
  adjusted = false,
  reference,
  className,
}: IntervalWhiskerProps) {
  const point = adjusted ? (rate.adjusted ?? rate.value) : rate.value
  if (point === null) return null
  const pct = (v: number) => `${Math.min(1, Math.max(0, v)) * 100}%`
  const interval = rate.interval

  return (
    <span
      className={cn('relative inline-block h-3 w-24 align-middle', className)}
      role='img'
      aria-label={
        interval
          ? `${formatPercent(point)}, intervalo del 95 % entre ${formatPercent(interval.low)} y ${formatPercent(interval.high)}`
          : formatPercent(point)
      }
    >
      <span className='bg-border absolute inset-x-0 top-1/2 h-px' aria-hidden />
      {interval && (
        <span
          aria-hidden
          className='border-foreground/60 absolute top-0.5 bottom-0.5 border-x-2'
          style={{
            left: pct(interval.low),
            right: `calc(100% - ${pct(interval.high)})`,
          }}
        >
          <span className='bg-foreground/60 absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2' />
        </span>
      )}
      {reference != null && (
        <span
          aria-hidden
          className='border-muted-foreground bg-background absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border'
          style={{ left: pct(reference) }}
        />
      )}
      <span
        aria-hidden
        className='bg-foreground ring-background absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2'
        style={{ left: pct(point) }}
      />
    </span>
  )
}

/** `86 %` plus `79–91 %` in muted ink, for tables. */
export function RateWithInterval({
  rate,
  adjusted = false,
}: {
  rate: RateEstimate
  adjusted?: boolean
}) {
  const point = adjusted ? (rate.adjusted ?? rate.value) : rate.value
  return (
    <span className='inline-flex items-center gap-2'>
      <span className='w-10 text-end font-medium tabular-nums'>
        {formatPercent(point)}
      </span>
      <IntervalWhisker rate={rate} adjusted={adjusted} className='w-16' />
    </span>
  )
}
