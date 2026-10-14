import type { AgentFloorRow, ChannelFilter } from '@chat-crm/contracts'
import { Frown } from 'lucide-react'
import { useNow } from '@/features/chats/hooks/use-now'
import { useLiveSnapshot } from '../hooks/use-analytics-queries'
import {
  formatClock,
  formatDuration,
  formatHour,
  formatPercent,
} from '../lib/format'
import { PRESENCE_META } from '../lib/presence-meta'
import { secondsSince, SLA_COLOR, slaStateFor } from '../lib/sla'
import { CapacityMeter } from './capacity-meter'
import { PresenceIcon } from './presence-badge'
import { WidgetSkeleton } from './widget'

type AgentFloorListProps = {
  channel?: ChannelFilter
  /** Tone column only while the sentiment IA is available. */
  showTone: boolean
}

/**
 * Every agent right now, riskiest first: who has customers waiting longest,
 * then who is closest to their capacity. Away and offline agents sink.
 */
export function AgentFloorList({
  channel = 'all',
  showTone,
}: AgentFloorListProps) {
  const { data: snapshot } = useLiveSnapshot(channel)
  const now = useNow(1000)

  if (!snapshot) return <WidgetSkeleton rows={4} />
  if (snapshot.agents.length === 0) {
    return (
      <p className='text-muted-foreground py-3 text-sm'>
        Todavía no hay agentes en la empresa. Invítalos desde Usuarios.
      </p>
    )
  }

  const elapsed = secondsSince(snapshot.generatedAt, now)
  const agents = [...snapshot.agents].sort(byRisk)

  return (
    <ul className='divide-y'>
      {agents.map((agent) => (
        <AgentRow
          key={agent.memberId}
          agent={agent}
          elapsed={elapsed}
          slaSeconds={snapshot.slaSeconds}
          showTone={showTone}
          now={now}
        />
      ))}
    </ul>
  )
}

function byRisk(a: AgentFloorRow, b: AgentFloorRow): number {
  const rank = (x: AgentFloorRow) =>
    x.presence === 'offline' ? 2 : x.presence === 'away' ? 1 : 0
  return (
    rank(a) - rank(b) ||
    (b.oldestWaitingSeconds ?? -1) - (a.oldestWaitingSeconds ?? -1) ||
    load(b) - load(a)
  )
}

const load = (agent: AgentFloorRow) =>
  agent.capacity ? agent.openCases / agent.capacity : 0

type AgentRowProps = {
  agent: AgentFloorRow
  elapsed: number
  slaSeconds: number
  showTone: boolean
  now: number
}

function AgentRow({
  agent,
  elapsed,
  slaSeconds,
  showTone,
  now,
}: AgentRowProps) {
  const presence = PRESENCE_META[agent.presence]
  const oldest =
    agent.oldestWaitingSeconds === null
      ? null
      : agent.oldestWaitingSeconds + elapsed

  return (
    <li className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-2.5 lg:grid-cols-[minmax(0,12rem)_10rem_minmax(0,1fr)_7rem_auto]'>
      <div className='flex min-w-0 items-center gap-2'>
        <PresenceIcon state={agent.presence} />
        <span className='truncate text-sm font-medium'>
          {agent.displayName}
        </span>
      </div>

      {agent.presence === 'offline' ? (
        <p className='text-muted-foreground col-span-1 text-sm lg:col-span-4'>
          {presence.label}
          {agent.presenceSince &&
            ` desde las ${formatHour(agent.presenceSince)}`}
        </p>
      ) : (
        <>
          <CapacityMeter
            open={agent.openCases}
            capacity={agent.capacity}
            className='justify-self-end lg:justify-self-start'
          />
          <p className='text-sm'>
            {agent.presence === 'away' ? (
              <span className='text-muted-foreground'>
                Ausente
                {agent.presenceSince &&
                  ` hace ${formatDuration((now - agent.presenceSince.getTime()) / 1000)}`}
              </span>
            ) : agent.waitingCount === 0 ? (
              <span className='text-muted-foreground'>Nadie esperando</span>
            ) : (
              <>
                <span className='font-semibold tabular-nums'>
                  {agent.waitingCount}
                </span>{' '}
                {agent.waitingCount === 1 ? 'espera' : 'esperan'}
                {oldest !== null && (
                  <span className='text-muted-foreground'>
                    {' · más antigua '}
                    <span
                      className='font-medium tabular-nums'
                      style={{
                        color: SLA_COLOR[slaStateFor(oldest, slaSeconds)],
                      }}
                    >
                      {formatClock(oldest)}
                    </span>
                  </span>
                )}
              </>
            )}
          </p>
          <p className='text-muted-foreground text-sm'>
            1ª resp.{' '}
            <span className='text-foreground tabular-nums'>
              {formatDuration(agent.firstResponseTodayMedian)}
            </span>
          </p>
          {showTone ? (
            <p
              className='text-muted-foreground flex items-center justify-end gap-1 text-sm tabular-nums'
              title='Mensajes de clientes con tono negativo hoy'
            >
              <Frown className='size-3.5' aria-label='Tono negativo' />
              {formatPercent(agent.negativeToneShare)}
            </p>
          ) : (
            <span className='hidden lg:block' />
          )}
        </>
      )}
    </li>
  )
}
