import type { ChannelFilter } from '@chat-crm/contracts'
import { useStaffing } from '../hooks/use-analytics-queries'
import { formatDecimal } from '../lib/format'
import { SufficiencyNote } from './sufficiency-note'
import { WidgetSkeleton } from './widget'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const HOURS = Array.from({ length: 24 }, (_, h) => h)

/**
 * Average arrivals by weekday × hour, one sequential hue (light → dark), so
 * shift planning reads at a glance. Exact values on hover and in the
 * screen-reader table.
 */
export function ArrivalsHeatmap({
  channel = 'all',
}: {
  channel?: ChannelFilter
}) {
  const { data } = useStaffing(channel)
  if (!data) return <WidgetSkeleton rows={3} />
  if (data.heatmap.length === 0) {
    return (
      <SufficiencyNote
        meta={data.meta}
        unit='days'
        what='el mapa de llegadas'
      />
    )
  }

  const values = new Map(
    data.heatmap.map((cell) => [
      `${cell.weekday}-${cell.hour}`,
      cell.averageArrivals,
    ])
  )
  const max = Math.max(
    ...data.heatmap.map((cell) => cell.averageArrivals),
    0.0001
  )

  return (
    <figure className='space-y-2'>
      <div className='overflow-x-auto'>
        <div
          className='grid min-w-[560px] gap-0.5'
          style={{ gridTemplateColumns: '2.5rem repeat(24, minmax(0, 1fr))' }}
          aria-hidden
        >
          <span />
          {HOURS.map((h) => (
            <span
              key={h}
              className='text-muted-foreground text-center text-[10px] tabular-nums'
            >
              {h % 3 === 0 ? h : ''}
            </span>
          ))}
          {WEEKDAYS.map((day, index) => (
            <Row
              key={day}
              day={day}
              weekday={index + 1}
              values={values}
              max={max}
            />
          ))}
        </div>
      </div>
      <figcaption className='text-muted-foreground flex items-center gap-2 text-xs'>
        <span>menos</span>
        <span
          className='h-2 w-24 rounded-full'
          style={{
            background:
              'linear-gradient(to right, color-mix(in oklch, var(--series-1) 8%, var(--muted)), var(--series-1))',
          }}
        />
        <span>más llegadas por hora (promedio de {data.historyDays} días)</span>
      </figcaption>
      <table className='sr-only'>
        <caption>Llegadas promedio por día y hora</caption>
        <tbody>
          {data.heatmap.map((cell) => (
            <tr key={`${cell.weekday}-${cell.hour}`}>
              <th>
                {WEEKDAYS[cell.weekday - 1]} {cell.hour}:00
              </th>
              <td>{formatDecimal(cell.averageArrivals)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

function Row({
  day,
  weekday,
  values,
  max,
}: {
  day: string
  weekday: number
  values: Map<string, number>
  max: number
}) {
  return (
    <>
      <span className='text-muted-foreground self-center text-xs'>{day}</span>
      {HOURS.map((h) => {
        const value = values.get(`${weekday}-${h}`) ?? 0
        const share = value / max
        return (
          <span
            key={h}
            className='h-5 rounded-[3px]'
            title={`${day} ${h}:00 — ${formatDecimal(value)} llegadas`}
            style={{
              backgroundColor: `color-mix(in oklch, var(--series-1) ${Math.round(8 + share * 92)}%, var(--muted))`,
            }}
          />
        )
      })}
    </>
  )
}
