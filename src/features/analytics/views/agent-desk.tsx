import type { ChannelFilter } from '@chat-crm/contracts'
import { CapacityMeter } from '../components/capacity-meter'
import { ControlChart } from '../components/control-chart'
import { CustomerToneBreakdown } from '../components/customer-tone-breakdown'
import { ResponseTimeSummary } from '../components/response-time-summary'
import { ServiceLevelGauge } from '../components/service-level-gauge'
import { WaitingCustomersStrip } from '../components/waiting-customers-strip'
import { Widget, WidgetSkeleton } from '../components/widget'
import {
  useMyPerformance,
  type AnalyticsRange,
} from '../hooks/use-analytics-queries'
import { formatDuration, formatInteger } from '../lib/format'

type AgentDeskProps = {
  range: AnalyticsRange & { channel: ChannelFilter }
  showTone: boolean
}

/**
 * "Mi turno": what to answer now first, then how the agent is doing against
 * the anonymous team median. No names of other agents anywhere.
 */
export function AgentDesk({ range, showTone }: AgentDeskProps) {
  return (
    <div className='space-y-4'>
      <Widget
        title='Te esperan ahora'
        description='La línea marca el tiempo de respuesta acordado; el más antiguo va primero.'
      >
        <WaitingCustomersStrip mode='agent' channel={range.channel} />
      </Widget>

      <Widget title='Mi carga' variant='plain'>
        <MyWorkload range={range} />
      </Widget>

      <div className='grid gap-4 lg:grid-cols-2'>
        <Widget
          title='Primera respuesta'
          description='Tiempo laboral hasta tu primer mensaje en cada caso.'
        >
          <MyFirstResponse range={range} />
        </Widget>
        <Widget title='Respondidos a tiempo'>
          <MyServiceLevel range={range} />
        </Widget>
      </div>

      <Widget
        title='Mi primera respuesta, día a día'
        description='Gráfico de control: solo los puntos marcados indican un cambio real.'
      >
        <MyFirstResponseControl range={range} />
      </Widget>

      {showTone && (
        <Widget title='Tono de mis clientes'>
          <CustomerToneBreakdown range={range} scope='me' />
        </Widget>
      )}
    </div>
  )
}

function MyWorkload({ range }: { range: AnalyticsRange }) {
  const { data } = useMyPerformance(range)
  if (!data) return <WidgetSkeleton rows={1} />
  const { performance } = data
  return (
    <dl className='flex flex-wrap gap-x-10 gap-y-3'>
      <div>
        <dt className='text-muted-foreground text-sm'>Casos abiertos</dt>
        <dd className='pt-1'>
          <CapacityMeter open={data.openCases} capacity={data.capacity} />
        </dd>
      </div>
      <div>
        <dt className='text-muted-foreground text-sm'>Resueltos</dt>
        <dd className='text-xl font-semibold tabular-nums'>
          {formatInteger(performance.resolvedCases)}
        </dd>
      </div>
      <div>
        <dt className='text-muted-foreground text-sm'>Reabiertos</dt>
        <dd className='text-xl font-semibold tabular-nums'>
          {formatInteger(performance.reopenRate.successes)}
        </dd>
      </div>
      <div>
        <dt className='text-muted-foreground text-sm'>Resolución mediana</dt>
        <dd className='text-xl font-semibold tabular-nums'>
          {formatDuration(performance.resolutionTime.median)}
        </dd>
      </div>
    </dl>
  )
}

function MyFirstResponse({ range }: { range: AnalyticsRange }) {
  const { data } = useMyPerformance(range)
  if (!data) return <WidgetSkeleton rows={3} />
  return (
    <ResponseTimeSummary
      summary={data.performance.firstResponse}
      team={{
        median: data.team.firstResponseMedian,
        p90: data.team.firstResponseP90,
      }}
      histogram={data.firstResponseHistogram}
      what='tu primera respuesta'
    />
  )
}

function MyServiceLevel({ range }: { range: AnalyticsRange }) {
  const { data } = useMyPerformance(range)
  if (!data) return <WidgetSkeleton rows={3} />
  return (
    <div className='space-y-1'>
      <p className='text-muted-foreground text-sm'>
        Casos con primera respuesta en menos de{' '}
        {formatDuration(data.slaSeconds)}
      </p>
      <ServiceLevelGauge
        rate={data.performance.serviceLevel}
        teamRate={data.team.serviceLevel}
      />
    </div>
  )
}

function MyFirstResponseControl({ range }: { range: AnalyticsRange }) {
  const { data } = useMyPerformance(range)
  if (!data) return <WidgetSkeleton rows={4} />
  return (
    <ControlChart
      chart={data.firstResponseControl}
      kind='duration'
      label='Primera respuesta'
    />
  )
}
