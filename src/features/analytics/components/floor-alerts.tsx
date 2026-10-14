import type { ChannelFilter } from '@chat-crm/contracts'
import { CircleCheck, TriangleAlert } from 'lucide-react'
import { useNow } from '@/features/chats/hooks/use-now'
import {
  useLiveSnapshot,
  useSentimentAnalytics,
} from '../hooks/use-analytics-queries'
import { secondsSince, slaStateFor } from '../lib/sla'
import { WidgetSkeleton } from './widget'

type Alert = { id: string; text: string }

type FloorAlertsProps = {
  channel?: ChannelFilter
  /** Adds the negative-tone spike alert (only while the IA is available). */
  showTone: boolean
}

/**
 * What needs a supervisor's hand right now, derived from the live snapshot:
 * SLA breaches and agents at or over capacity (plus a tone spike from the
 * XmR chart when the IA is on). Each alert says who and how much.
 */
export function FloorAlerts({ channel = 'all', showTone }: FloorAlertsProps) {
  const { data: snapshot } = useLiveSnapshot(channel)
  const now = useNow(1000)
  if (!snapshot) return <WidgetSkeleton rows={2} />

  const elapsed = secondsSince(snapshot.generatedAt, now)
  const breaches = snapshot.waiting.filter(
    (w) =>
      slaStateFor(w.waitingSeconds + elapsed, snapshot.slaSeconds) === 'breach'
  ).length

  const alerts: Alert[] = []
  if (breaches > 0) {
    alerts.push({
      id: 'sla',
      text:
        breaches === 1
          ? '1 cliente superó el tiempo de respuesta.'
          : `${breaches} clientes superaron el tiempo de respuesta.`,
    })
  }
  for (const agent of snapshot.agents) {
    if (
      agent.capacity !== null &&
      agent.openCases >= agent.capacity &&
      agent.presence !== 'offline'
    ) {
      alerts.push({
        id: `cap-${agent.memberId}`,
        text: `${agent.displayName} está en su capacidad (${agent.openCases} de ${agent.capacity}).`,
      })
    }
  }
  if (
    snapshot.queue.unassignedCount > 0 &&
    snapshot.agents.every((a) => a.presence !== 'available')
  ) {
    alerts.push({
      id: 'nobody',
      text: 'Hay clientes en cola y ningún agente disponible.',
    })
  }

  return (
    <div className='space-y-2'>
      {/* With the IA on, the tone check decides whether all is clear. */}
      {alerts.length === 0 && !showTone && <AllClear />}
      <ul className='space-y-2'>
        {alerts.map((alert) => (
          <AlertItem key={alert.id} text={alert.text} />
        ))}
        {showTone && (
          <ToneSpikeAlert channel={channel} hasOthers={alerts.length > 0} />
        )}
      </ul>
    </div>
  )
}

function AlertItem({ text }: { text: string }) {
  return (
    <li className='flex items-start gap-2 text-sm'>
      <TriangleAlert
        className='text-sla-breach mt-0.5 size-4 shrink-0'
        aria-label='Alerta'
      />
      <span>{text}</span>
    </li>
  )
}

function AllClear() {
  return (
    <p className='flex items-center gap-2 text-sm'>
      <CircleCheck className='text-sla-ok size-4' aria-hidden />
      Sin alertas. El piso está dentro de lo esperado.
    </p>
  )
}

/** Mounted only while the IA is available (its endpoint 409s otherwise). */
function ToneSpikeAlert({
  channel,
  hasOthers,
}: {
  channel: ChannelFilter
  hasOthers: boolean
}) {
  const { data } = useSentimentAnalytics({ period: '30d', channel })
  const last = data?.negativeControl.points.at(-1)
  if (last && last.signal !== 'none') {
    return (
      <AlertItem text='El tono negativo de los clientes salió de su rango normal hoy.' />
    )
  }
  return hasOthers || !data ? null : (
    <li>
      <AllClear />
    </li>
  )
}
