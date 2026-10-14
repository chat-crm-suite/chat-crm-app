import type { SpendSummary } from '@chat-crm/contracts'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { formatUsd } from '../lib/format'
import { ChartTooltipCard } from './chart-tooltip-card'

type SpendPoint = {
  day: number
  actual: number | null
  projected: number | null
  band: [number, number] | null
}

/**
 * Cumulative spend this month, then the run-rate projection to month end
 * (dashed) inside its 95 % band. One USD axis; the budget is a reference line.
 */
export function SpendTrend({ summary }: { summary: SpendSummary }) {
  const data = buildSeries(summary)
  if (data.length === 0) return null
  const budget = summary.budget.monthlyBudgetUsd

  return (
    <ChartContainer
      config={{
        actual: { label: 'Gastado', color: 'var(--spend)' },
        projected: { label: 'Proyección', color: 'var(--spend)' },
      }}
      className='aspect-auto h-48 w-full'
    >
      <ComposedChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
      >
        <CartesianGrid vertical={false} strokeOpacity={0.5} />
        <XAxis
          dataKey='day'
          tickLine={false}
          axisLine={false}
          minTickGap={20}
        />
        <YAxis
          tickFormatter={(v: number) => formatUsd(v)}
          tickLine={false}
          axisLine={false}
          width={64}
        />
        {budget !== null && (
          <ReferenceLine
            y={budget}
            stroke='var(--sla-breach)'
            strokeDasharray='4 4'
            label={{
              value: 'presupuesto',
              position: 'insideTopRight',
              fontSize: 11,
              fill: 'var(--muted-foreground)',
            }}
          />
        )}
        <ChartTooltip
          content={({ active, payload }) => {
            const point = payload?.[0]?.payload as SpendPoint | undefined
            if (!active || !point) return null
            return (
              <ChartTooltipCard
                title={`Día ${point.day}`}
                rows={[
                  point.actual !== null
                    ? {
                        label: 'Gastado',
                        value: formatUsd(point.actual),
                        color: 'var(--spend)',
                      }
                    : {
                        label: 'Proyección',
                        value: formatUsd(point.projected),
                        color: 'var(--spend)',
                      },
                ]}
                footer={
                  point.band && point.actual === null
                    ? `Entre ${formatUsd(point.band[0])} y ${formatUsd(point.band[1])}`
                    : undefined
                }
              />
            )
          }}
        />
        <Area
          dataKey='band'
          stroke='none'
          fill='var(--spend)'
          fillOpacity={0.12}
          isAnimationActive={false}
          connectNulls={false}
        />
        <Line
          dataKey='actual'
          stroke='var(--color-actual)'
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <Line
          dataKey='projected'
          stroke='var(--color-projected)'
          strokeWidth={2}
          strokeDasharray='5 4'
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ChartContainer>
  )
}

function buildSeries(summary: SpendSummary): SpendPoint[] {
  const [year, month] = summary.month.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const byDay = new Map(
    summary.daily.map((d) => [Number(d.date.slice(8, 10)), d.totalUsd])
  )
  const lastDay = summary.daily.length
    ? Math.max(...summary.daily.map((d) => Number(d.date.slice(8, 10))))
    : 0
  if (lastDay === 0) return []

  const points: SpendPoint[] = []
  let cumulative = 0
  for (let day = 1; day <= lastDay; day++) {
    cumulative += byDay.get(day) ?? 0
    points.push({ day, actual: cumulative, projected: null, band: null })
  }

  const projection = summary.projection
  if (projection && projection.meta.status === 'ok' && lastDay < daysInMonth) {
    const start = cumulative
    points[points.length - 1] = {
      ...points[points.length - 1],
      projected: start,
      band: [start, start],
    }
    for (let day = lastDay + 1; day <= daysInMonth; day++) {
      const t = (day - lastDay) / (daysInMonth - lastDay)
      points.push({
        day,
        actual: null,
        projected: start + (projection.expectedUsd - start) * t,
        band: [
          start + (projection.lowUsd - start) * t,
          start + (projection.highUsd - start) * t,
        ],
      })
    }
  }
  return points
}
