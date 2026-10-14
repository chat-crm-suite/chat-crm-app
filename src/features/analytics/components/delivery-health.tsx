import type { RateEstimate } from '@chat-crm/contracts'
import {
  useDelivery,
  type AnalyticsRange,
} from '../hooks/use-analytics-queries'
import { formatInteger, formatPercent } from '../lib/format'
import { IntervalWhisker } from './interval-whisker'
import { WidgetSkeleton } from './widget'

/** Outbound delivery funnel with Wilson intervals and the top error codes. */
export function DeliveryHealth({ range }: { range: AnalyticsRange }) {
  const { data } = useDelivery(range)
  if (!data) return <WidgetSkeleton rows={3} />
  if (data.sent === 0) {
    return (
      <p className='text-muted-foreground text-sm'>
        No se enviaron mensajes en este periodo.
      </p>
    )
  }

  return (
    <div className='space-y-4'>
      <p className='text-muted-foreground text-sm'>
        Sobre {formatInteger(data.sent)} mensajes enviados
      </p>
      <dl className='space-y-2.5'>
        <RateRow label='Entregados' rate={data.delivered} />
        <RateRow label='Leídos' rate={data.read} />
        <RateRow label='Fallidos' rate={data.failed} />
      </dl>
      {data.topErrors.length > 0 && (
        <div className='space-y-1.5 border-t pt-3'>
          <p className='text-sm font-medium'>Errores más frecuentes</p>
          <ul className='space-y-1 text-sm'>
            {data.topErrors.map((error) => (
              <li key={error.code} className='flex gap-3'>
                <span className='text-muted-foreground w-14 shrink-0 tabular-nums'>
                  {error.code}
                </span>
                <span className='min-w-0 flex-1 truncate'>
                  {error.message ?? 'Sin descripción'}
                </span>
                <span className='tabular-nums'>
                  {formatInteger(error.count)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function RateRow({ label, rate }: { label: string; rate: RateEstimate }) {
  return (
    <div className='grid grid-cols-[6rem_3.5rem_1fr] items-center gap-3'>
      <dt className='text-sm'>{label}</dt>
      <dd className='text-end font-semibold tabular-nums'>
        {formatPercent(rate.value)}
      </dd>
      <dd>
        <IntervalWhisker rate={rate} className='w-full max-w-56' />
      </dd>
    </div>
  )
}
