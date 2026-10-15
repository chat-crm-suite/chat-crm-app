import type { ControlChart as ControlChartData } from '@chat-crm/contracts'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
  type DotProps,
} from 'recharts'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import {
  formatDay,
  formatDecimal,
  formatDuration,
  formatPercent,
} from '../lib/format'
import { ChartTooltipCard } from './chart-tooltip-card'
import { SufficiencyNote } from './sufficiency-note'

export type ControlValueKind = 'duration' | 'rate' | 'count'

const FORMATTERS: Record<ControlValueKind, (v: number | null) => string> = {
  duration: formatDuration,
  rate: formatPercent,
  count: formatDecimal,
}

const SIGNAL_COPY = {
  'beyond-limits': 'fuera de los límites',
  'run-of-8': '8 días seguidos del mismo lado',
} as const

type ControlChartProps = {
  chart: ControlChartData
  kind: ControlValueKind
  /** Series name for tooltips and the accessible summary. */
  label: string
}

type Point = ControlChartData['points'][number]

/**
 * Shewhart individuals (XmR) chart: the daily value against its center line
 * and ±3σ limits. Points that break a Western Electric rule are ringed in
 * red; everything inside the limits is ordinary variation, not a change.
 */
export function ControlChart({ chart, kind, label }: ControlChartProps) {
  if (chart.meta.status !== 'ok' || chart.center === null) {
    return (
      <SufficiencyNote
        meta={chart.meta}
        unit='days'
        what='el gráfico de control'
      />
    )
  }

  const format = FORMATTERS[kind]
  // Durations, counts and rates cannot go below zero, whatever 3σ says.
  const lower = chart.lowerLimit === null ? null : Math.max(0, chart.lowerLimit)
  const signals = chart.points.filter((p) => p.signal !== 'none')

  return (
    <figure className='space-y-2'>
      <ChartContainer
        config={{ value: { label, color: 'var(--series-1)' } }}
        className='aspect-auto h-52 w-full'
      >
        <LineChart
          data={chart.points}
          margin={{ top: 8, right: 56, bottom: 0, left: 0 }}
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
            tickFormatter={(v: number) => format(v)}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          {chart.upperLimit !== null && (
            <ReferenceLine
              y={chart.upperLimit}
              stroke='var(--control-limit)'
              strokeDasharray='4 4'
              label={{
                value: 'límite sup.',
                position: 'right',
                fontSize: 11,
                fill: 'var(--muted-foreground)',
              }}
            />
          )}
          <ReferenceLine
            y={chart.center}
            stroke='var(--control-limit)'
            label={{
              value: 'centro',
              position: 'right',
              fontSize: 11,
              fill: 'var(--muted-foreground)',
            }}
          />
          {lower !== null && (
            <ReferenceLine
              y={lower}
              stroke='var(--control-limit)'
              strokeDasharray='4 4'
              label={{
                value: 'límite inf.',
                position: 'right',
                fontSize: 11,
                fill: 'var(--muted-foreground)',
              }}
            />
          )}
          <ChartTooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as Point | undefined
              if (!active || !point) return null
              return (
                <ChartTooltipCard
                  title={formatDay(point.date)}
                  rows={[
                    {
                      label,
                      value: format(point.value),
                      color: 'var(--series-1)',
                    },
                  ]}
                  footer={
                    point.signal !== 'none'
                      ? `Señal: ${SIGNAL_COPY[point.signal]}`
                      : undefined
                  }
                />
              )
            }}
          />
          <Line
            dataKey='value'
            type='linear'
            stroke='var(--color-value)'
            strokeWidth={2}
            isAnimationActive={false}
            connectNulls={false}
            dot={(props: DotProps & { payload?: Point; index?: number }) => (
              <SignalDot key={props.index} {...props} />
            )}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ChartContainer>
      <figcaption className='text-muted-foreground text-sm'>
        {signals.length === 0
          ? 'Todo dentro de los límites: la variación es la normal del proceso.'
          : `${signals.length === 1 ? 'Un día muestra' : `${signals.length} días muestran`} un cambio real (${signals
              .map((p) => formatDay(p.date))
              .join(', ')}). Revisa qué pasó esos días.`}
      </figcaption>
    </figure>
  )
}

function SignalDot({ cx, cy, payload }: DotProps & { payload?: Point }) {
  if (cx == null || cy == null || payload?.value == null) return null
  if (payload.signal === 'none') {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={3}
        fill='var(--series-1)'
        stroke='var(--background)'
        strokeWidth={2}
      />
    )
  }
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill='var(--background)'
        stroke='var(--sla-breach)'
        strokeWidth={2}
      />
      <circle cx={cx} cy={cy} r={2.5} fill='var(--sla-breach)' />
    </g>
  )
}
