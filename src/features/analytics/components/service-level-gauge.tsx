import type { RateEstimate } from '@chat-crm/contracts'
import { formatPercent } from '../lib/format'
import { IntervalWhisker } from './interval-whisker'
import { SufficiencyNote } from './sufficiency-note'

type ServiceLevelGaugeProps = {
  rate: RateEstimate
  teamRate?: number | null
}

/**
 * Share of cases answered within the SLA, the big number of the agent desk,
 * with its Wilson interval and the anonymous team median as reference.
 */
export function ServiceLevelGauge({ rate, teamRate }: ServiceLevelGaugeProps) {
  if (rate.meta.status === 'empty' || rate.value === null) {
    return (
      <SufficiencyNote
        meta={rate.meta}
        unit='cases'
        what='el nivel de servicio'
      />
    )
  }

  return (
    <div className='space-y-2'>
      <p className='flex flex-wrap items-baseline gap-x-3'>
        <span className='text-[40px] leading-none font-semibold tabular-nums'>
          {formatPercent(rate.value)}
        </span>
        {rate.interval && (
          <span className='text-muted-foreground text-sm tabular-nums'>
            entre {formatPercent(rate.interval.low)} y{' '}
            {formatPercent(rate.interval.high)}
          </span>
        )}
      </p>
      <IntervalWhisker
        rate={rate}
        reference={teamRate}
        className='w-full max-w-72'
      />
      <p className='text-muted-foreground text-sm'>
        {rate.successes} de {rate.trials} casos
        {teamRate != null && (
          <>
            {' · '}equipo{' '}
            <span className='tabular-nums'>{formatPercent(teamRate)}</span>{' '}
            <span aria-hidden>◆</span>
          </>
        )}
      </p>
      {rate.meta.status === 'insufficient' && (
        <SufficiencyNote
          meta={rate.meta}
          unit='cases'
          what='una cifra estable'
        />
      )}
    </div>
  )
}
