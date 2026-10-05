import { useQuery } from '@tanstack/react-query'
import { TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { getBestAgents } from '@/features/dashboard/clients/metrics.client'

const chartConfig = {
  totalPositive: {
    label: 'Positivos',
    color: 'var(--chart-2)',
  },
  name: {
    color: 'white',
  },
  label: {
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

export function TopAgentsChart() {
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['metrics', 'agents'],
    queryFn: () => getBestAgents,
  })

  if (isLoading) return <div>Cargando ranking...</div>

  const chartData = agents.map((a) => ({
    name: a.username ?? a.label ?? 'Sin nombre',
    totalPositive: Number(a.positive ?? 0),
    avgPos: Number(a.positive ?? 0),
    score: Number(a.total ?? 0),
  }))

  return (
    <Card className='col-span-1 flex h-full justify-between lg:col-span-3'>
      <CardHeader className='relative'>
        <CardTitle>Ranking de Mejores Agentes</CardTitle>
        <CardDescription>
          Basado en mensajes positivos analizados
        </CardDescription>
        <TrendingUp className='absolute top-2.5 right-8' />
      </CardHeader>
      <CardContent className='flex-1'>
        <ChartContainer config={chartConfig} className='h-full w-full'>
          <BarChart accessibilityLayer data={chartData} layout='vertical'>
            <CartesianGrid horizontal={true} />
            <YAxis
              dataKey='name'
              type='category'
              className='capitalize'
              tickLine={false}
              axisLine={false}
              hide
            />
            <XAxis dataKey='totalPositive' type='number' hide />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator='line'
                  labelFormatter={(value) => `Agente: ${value}`}
                />
              }
            />
            <Bar
              dataKey='totalPositive'
              layout='vertical'
              fill='var(--chart-1)'
              radius={4}
            >
              <LabelList
                dataKey='name'
                position='insideLeft'
                fill='--foreground'
                className='font-semibold capitalize'
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className='flex-col items-start gap-2 text-sm'>
        <div className='flex gap-2 leading-none font-medium'>
          Ranking actualizado en tiempo real <TrendingUp className='h-4 w-4' />
        </div>
        <div className='text-muted-foreground leading-none'>
          Muestra los agentes con mayor número de mensajes positivos
        </div>
      </CardFooter>
    </Card>
  )
}
