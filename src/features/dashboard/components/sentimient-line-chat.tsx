import { useState } from 'react'
import { format } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { CartesianGrid, Line, LineChart, XAxis } from 'recharts'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { ChartLegend, ChartLegendContent } from '@/components/ui/chart'
import { getSentimentTrend } from '@/features/dashboard/clients/metrics.client'

const chartConfig = {
  pos: {
    label: 'Positivo',
    color: 'var(--chart-1)',
  },
  neg: {
    label: 'Negativo',
    color: 'var(--chart-2)',
  },
  neu: {
    label: 'Neutral',
    color: 'var(--chart-3)',
  },
} satisfies ChartConfig

type RangeType = 'day' | 'week' | 'month' | 'year'

const buttonGroupContents: Record<RangeType, string> = {
  day: '24h',
  week: '7d',
  year: '12M',
  month: '30d',
}

export function SentimentLineChart() {
  const [range, setRange] = useState<'month' | 'year' | 'day' | 'week'>('month')
  const { data, isFetching } = useQuery({
    queryKey: ['metrics', 'chart', 'line', 'sentiments', range],
    // NOTE: `sentiment/trend` has no per-user filter; the trend is global.
    queryFn: () => getSentimentTrend(range),
  })

  const chartData =
    data?.map((item) => ({
      day: item.date,
      pos: item.pos,
      neg: item.neg,
      neu: item.neu,
    })) ?? []

  return (
    <Card className='col-span-1 lg:col-span-4'>
      <CardHeader className='relative'>
        <CardTitle>Analisis de Sentimiento</CardTitle>
        <CardDescription>Distribución emocional todos mensajes</CardDescription>
        <ButtonGroup className='end-5 mt-2 lg:absolute'>
          {(['year', 'month', 'week', 'day'] as const).map((key) => (
            <Button
              key={key}
              variant='outline'
              className={cn(
                'text-xs transition-all duration-200',
                'hover:bg-primary/10 hover:text-primary',
                range === key
                  ? 'bg-primary font-semibold text-white'
                  : 'text-muted-foreground'
              )}
              onClick={() => setRange(key)}
              disabled={isFetching && range === key}
            >
              {buttonGroupContents[key]}
            </Button>
          ))}
        </ButtonGroup>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{ left: 5, right: 5 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey='day'
              tickFormatter={(value) => {
                try {
                  if (range === 'year') {
                    const [year, month] = value.split('-')
                    const parsed = new Date(Number(year), Number(month) - 1)
                    return format(parsed, 'MMM')
                  }

                  const date = new Date(value) // YYYY-MM-DD and YYYY-MM-DD HH:mm:ss
                  if (isNaN(date.getTime())) return value

                  if (range === 'day') return format(date, 'HH:mm') // hour
                  if (range === 'week' || range === 'month')
                    return format(date, 'MMM d') // day and month
                  return value
                } catch {
                  return value
                }
              }}
              tickLine={false}
              axisLine={false}
              tickMargin={7}
            />

            <Line
              dataKey='pos'
              type='monotone'
              stroke='oklch(0.571 0.181 145.0)'
              strokeWidth={2}
              dot={true}
            />
            <Line
              dataKey='neg'
              type='monotone'
              stroke='oklch(0.55 0.2 20)'
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey='neu'
              type='monotone'
              stroke='oklch(0.549 0.000 0.0)'
              strokeWidth={2}
              dot={false}
            />
            <ChartTooltip cursor={true} content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
