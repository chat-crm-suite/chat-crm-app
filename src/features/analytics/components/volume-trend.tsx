import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from '@/components/ui/chart'
import { useVolume, type AnalyticsRange } from '../hooks/use-analytics-queries'
import { formatDay, formatDecimal, formatInteger } from '../lib/format'
import { ChartTooltipCard } from './chart-tooltip-card'
import { ControlChart } from './control-chart'
import { SufficiencyNote } from './sufficiency-note'
import { WidgetSkeleton } from './widget'

/** Fixed categorical order: identity follows the series, never its rank. */
const SERIES = [
  { key: 'newCases', label: 'Casos nuevos', color: 'var(--series-1)' },
  { key: 'resolvedCases', label: 'Resueltos', color: 'var(--series-2)' },
  { key: 'backlog', label: 'Abiertos al cierre', color: 'var(--series-3)' },
] as const

/** Daily case flow (one count axis) plus new cases on a control chart. */
export function VolumeTrend({ range }: { range: AnalyticsRange }) {
  const { data } = useVolume(range)
  if (!data) return <WidgetSkeleton rows={5} />
  if (data.meta.status === 'empty' || data.days.length === 0) {
    return (
      <SufficiencyNote
        meta={data.meta}
        unit='days'
        what='las tendencias de volumen'
      />
    )
  }

  const config = Object.fromEntries(
    SERIES.map((s) => [s.key, { label: s.label, color: s.color }])
  )

  return (
    <div className='space-y-5'>
      <ChartContainer config={config} className='aspect-auto h-56 w-full'>
        <LineChart
          data={data.days}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid vertical={false} strokeOpacity={0.5} />
          <XAxis
            dataKey='date'
            tickFormatter={formatDay}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <ChartTooltip
            content={({ active, payload }) => {
              const day = payload?.[0]?.payload as
                (typeof data.days)[number] | undefined
              if (!active || !day) return null
              return (
                <ChartTooltipCard
                  title={formatDay(day.date)}
                  rows={SERIES.map((s) => ({
                    label: s.label,
                    value: formatInteger(day[s.key]),
                    color: s.color,
                  }))}
                />
              )
            }}
          />
          <ChartLegend content={<ChartLegendContent />} />
          {SERIES.map((s) => (
            <Line
              key={s.key}
              dataKey={s.key}
              type='monotone'
              stroke={`var(--color-${s.key})`}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>

      <div className='space-y-1'>
        <p className='text-sm font-medium'>Casos nuevos por día</p>
        <ControlChart
          chart={data.newCasesControl}
          kind='count'
          label='Casos nuevos'
        />
      </div>

      <dl className='grid grid-cols-3 gap-4 border-t pt-4'>
        <Stat
          label='Clientes nuevos'
          value={formatInteger(data.customers.new)}
        />
        <Stat
          label='Recurrentes'
          value={formatInteger(data.customers.returning)}
        />
        <Stat
          label='Casos por cliente'
          value={formatDecimal(data.customers.casesPerCustomer)}
        />
      </dl>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className='text-muted-foreground text-sm'>{label}</dt>
      <dd className='text-xl font-semibold tabular-nums'>{value}</dd>
    </div>
  )
}
