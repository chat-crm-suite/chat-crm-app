import type { ChannelFilter } from '@chat-crm/contracts'
import { AgentFloorList } from '../components/agent-floor-list'
import { ArrivalsHeatmap } from '../components/arrivals-heatmap'
import { FloorAlerts } from '../components/floor-alerts'
import { QueuePressure } from '../components/queue-pressure'
import { StaffingForecast } from '../components/staffing-forecast'
import { WaitingCustomersStrip } from '../components/waiting-customers-strip'
import { Widget } from '../components/widget'
import { PerformanceSection } from './performance-section'

type FloorMonitorProps = {
  channel: ChannelFilter
  showTone: boolean
}

/**
 * "Piso en vivo" (supervisors and the admin operations tab): who is waiting,
 * how each agent is doing right now, whether the staffing covers the next
 * hours, and today's numbers per agent.
 */
export function FloorMonitor({ channel, showTone }: FloorMonitorProps) {
  return (
    <div className='space-y-4'>
      <Widget
        title='Clientes esperando'
        description='Cada barra crece hacia la línea del tiempo de respuesta acordado.'
      >
        <div className='space-y-4'>
          <WaitingCustomersStrip mode='supervisor' channel={channel} />
          <div className='border-t pt-3'>
            <QueuePressure channel={channel} />
          </div>
        </div>
      </Widget>

      <Widget
        title='Agentes'
        description='Primero quien tiene clientes esperando hace más tiempo.'
      >
        <AgentFloorList channel={channel} showTone={showTone} />
      </Widget>

      <div className='grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]'>
        <Widget
          title='Personal necesario'
          description='Erlang C con las llegadas históricas de cada hora.'
        >
          <StaffingForecast channel={channel} />
        </Widget>
        <Widget title='Alertas'>
          <FloorAlerts channel={channel} showTone={showTone} />
        </Widget>
      </div>

      <Widget title='Hoy por agente'>
        <PerformanceSection
          range={{ period: 'today', channel }}
          showTone={showTone}
        />
      </Widget>

      <Widget title='Llegadas por hora y día'>
        <ArrivalsHeatmap channel={channel} />
      </Widget>
    </div>
  )
}
