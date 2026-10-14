import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { assignMember, claimChat } from '@/services/chat.service'
import type {
  AgentFloorRow,
  ChannelFilter,
  WaitingCustomer,
} from '@chat-crm/contracts'
import { CircleCheck, TriangleAlert, UserRoundPlus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNow } from '@/features/chats/hooks/use-now'
import { useLiveSnapshot } from '../hooks/use-analytics-queries'
import { channelMeta } from '../lib/channel-meta'
import { formatClock, formatDuration } from '../lib/format'
import { SLA_COLOR, SLA_LABEL, secondsSince, slaStateFor } from '../lib/sla'
import { WidgetSkeleton } from './widget'

/** Bars span 1.5× the SLA, so the SLA line sits at two thirds of the track. */
const TRACK_SLA_MULTIPLE = 1.5
const COLLAPSED_ROWS = 8

type Mode = 'agent' | 'supervisor'

type WaitingCustomersStripProps = {
  mode: Mode
  channel?: ChannelFilter
}

/**
 * The signature view of the floor: every customer waiting for a reply is a
 * bar growing live toward the SLA line, turning amber near it and red past
 * it. Agents see their own customers plus the unassigned queue; supervisors
 * see everyone and can (re)assign from the row.
 */
export function WaitingCustomersStrip({
  mode,
  channel = 'all',
}: WaitingCustomersStripProps) {
  const { data: snapshot } = useLiveSnapshot(channel)
  const now = useNow(1000)
  const [expanded, setExpanded] = useState(false)

  if (!snapshot) return <WidgetSkeleton rows={4} />

  const elapsed = secondsSince(snapshot.generatedAt, now)
  const rows =
    mode === 'agent'
      ? snapshot.waiting.filter((w) => w.assignee !== null)
      : snapshot.waiting
  const visible = expanded ? rows : rows.slice(0, COLLAPSED_ROWS)
  const hidden = rows.length - visible.length
  const beyondList = Math.max(
    0,
    snapshot.waitingTotal - snapshot.waiting.length
  )

  return (
    <div className='space-y-3'>
      {rows.length === 0 ? (
        <p className='flex items-center gap-2 py-3 text-sm'>
          <CircleCheck className='text-sla-ok size-4' aria-hidden />
          {mode === 'agent'
            ? 'Ningún cliente tuyo está esperando respuesta.'
            : 'Nadie está esperando una respuesta.'}
        </p>
      ) : (
        <ol
          className='space-y-2.5'
          aria-label='Clientes esperando, el más antiguo primero'
        >
          {visible.map((waiting) => (
            <WaitingRow
              key={waiting.caseId}
              waiting={waiting}
              waitingSeconds={waiting.waitingSeconds + elapsed}
              slaSeconds={snapshot.slaSeconds}
              mode={mode}
              agents={snapshot.agents}
            />
          ))}
        </ol>
      )}

      {(hidden > 0 || beyondList > 0) && (
        <div className='text-muted-foreground flex flex-wrap items-center gap-3 text-sm'>
          {hidden > 0 && (
            <Button
              variant='ghost'
              size='sm'
              className='-ms-2 h-8'
              onClick={() => setExpanded(true)}
            >
              Mostrar {hidden} más
            </Button>
          )}
          {beyondList > 0 && (
            <span>Hay {beyondList} esperando además de los listados.</span>
          )}
        </div>
      )}

      {mode === 'agent' && (
        <UnassignedQueueLine
          count={snapshot.queue.unassignedCount}
          oldestSeconds={
            snapshot.queue.oldestWaitingSeconds === null
              ? null
              : snapshot.queue.oldestWaitingSeconds + elapsed
          }
          next={oldestUnassigned(snapshot.waiting)}
        />
      )}
    </div>
  )
}

function oldestUnassigned(waiting: WaitingCustomer[]) {
  return waiting
    .filter((w) => w.assignee === null)
    .sort((a, b) => b.waitingSeconds - a.waitingSeconds)[0]
}

type WaitingRowProps = {
  waiting: WaitingCustomer
  waitingSeconds: number
  slaSeconds: number
  mode: Mode
  agents: AgentFloorRow[]
}

function WaitingRow({
  waiting,
  waitingSeconds,
  slaSeconds,
  mode,
  agents,
}: WaitingRowProps) {
  const state = slaStateFor(waitingSeconds, slaSeconds)
  const fill = Math.min(1, waitingSeconds / (slaSeconds * TRACK_SLA_MULTIPLE))
  const name = waiting.customer.displayName ?? 'Cliente sin nombre'
  const label = SLA_LABEL[state]

  return (
    <li className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_7.5rem_auto]'>
      <div className='order-1 min-w-0'>
        <p className='truncate text-sm font-medium'>{name}</p>
        {mode === 'supervisor' && (
          <p className='text-muted-foreground truncate text-xs'>
            {waiting.assignee ? waiting.assignee.displayName : 'Sin asignar'}
            {' · '}
            {channelMeta[waiting.channelType].label}
          </p>
        )}
      </div>

      <div
        className='bg-muted relative order-3 col-span-2 h-2.5 rounded-full sm:order-2 sm:col-span-1'
        role='meter'
        aria-label={`Espera de ${name}`}
        aria-valuemin={0}
        aria-valuemax={slaSeconds}
        aria-valuenow={Math.min(waitingSeconds, slaSeconds)}
        aria-valuetext={`${formatDuration(waitingSeconds)} de ${formatDuration(slaSeconds)}`}
      >
        <div
          className='h-full rounded-full transition-[width,background-color] duration-1000 ease-linear motion-reduce:transition-none'
          style={{ width: `${fill * 100}%`, backgroundColor: SLA_COLOR[state] }}
        />
        {/* SLA line: two thirds of the track. */}
        <span
          aria-hidden
          className='bg-foreground/60 absolute -top-1 -bottom-1 w-0.5 rounded-full'
          style={{ left: `${(1 / TRACK_SLA_MULTIPLE) * 100}%` }}
        />
      </div>

      <p className='order-2 text-end text-sm sm:order-3 sm:text-start'>
        <span className='font-semibold tabular-nums'>
          {formatClock(waitingSeconds)}
        </span>
        {label && (
          <span
            className='ms-1.5 inline-flex items-center gap-1 text-xs font-medium'
            style={{ color: SLA_COLOR[state] }}
          >
            {state === 'breach' && (
              <TriangleAlert className='size-3' aria-hidden />
            )}
            {label}
          </span>
        )}
      </p>

      <div className='order-4 col-span-2 flex gap-1.5 sm:col-span-1 sm:justify-self-end'>
        {mode === 'supervisor' && (
          <AssignMenu waiting={waiting} agents={agents} />
        )}
        {mode === 'agent' && waiting.assignee === null ? (
          <TakeButton conversationId={waiting.conversationId} />
        ) : (
          <Button asChild size='sm' variant='outline' className='h-8'>
            <Link to='/chats' search={{ conversation: waiting.conversationId }}>
              Abrir chat
            </Link>
          </Button>
        )}
      </div>
    </li>
  )
}

function useTake() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: string) => claimChat(conversationId),
    onSuccess: (_data, conversationId) => {
      void queryClient.invalidateQueries({ queryKey: ['analytics', 'live'] })
      void queryClient.invalidateQueries({ queryKey: ['chat'] })
      void navigate({ to: '/chats', search: { conversation: conversationId } })
    },
    onError: () => {
      toast.error('Otro agente tomó este cliente primero.')
      void queryClient.invalidateQueries({ queryKey: ['analytics', 'live'] })
    },
  })
}

function TakeButton({ conversationId }: { conversationId: string }) {
  const take = useTake()
  return (
    <Button
      size='sm'
      className='h-8'
      disabled={take.isPending}
      onClick={() => take.mutate(conversationId)}
    >
      {take.isPending ? 'Tomando…' : 'Tomar'}
    </Button>
  )
}

type UnassignedQueueLineProps = {
  count: number
  oldestSeconds: number | null
  next: WaitingCustomer | undefined
}

function UnassignedQueueLine({
  count,
  oldestSeconds,
  next,
}: UnassignedQueueLineProps) {
  const take = useTake()
  if (count === 0) {
    return (
      <p className='text-muted-foreground border-t pt-3 text-sm'>
        La cola sin asignar está vacía.
      </p>
    )
  }
  return (
    <div className='flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-sm'>
      <p>
        <span className='font-semibold tabular-nums'>{count}</span>{' '}
        {count === 1
          ? 'cliente en cola sin asignar'
          : 'clientes en cola sin asignar'}
        {oldestSeconds !== null && (
          <span className='text-muted-foreground'>
            {' '}
            · el más antiguo espera{' '}
            <span className='tabular-nums'>{formatClock(oldestSeconds)}</span>
          </span>
        )}
      </p>
      <Button
        size='sm'
        className='h-8'
        disabled={!next || take.isPending}
        onClick={() => next && take.mutate(next.conversationId)}
      >
        {take.isPending ? 'Tomando…' : 'Tomar el siguiente'}
      </Button>
    </div>
  )
}

function AssignMenu({
  waiting,
  agents,
}: {
  waiting: WaitingCustomer
  agents: AgentFloorRow[]
}) {
  const queryClient = useQueryClient()
  const assign = useMutation({
    mutationFn: (memberId: string) =>
      assignMember(waiting.conversationId, memberId),
    onSuccess: (_data, memberId) => {
      const agent = agents.find((a) => a.memberId === memberId)
      toast.success(`Asignado a ${agent?.displayName ?? 'el agente'}.`)
      void queryClient.invalidateQueries({ queryKey: ['analytics', 'live'] })
    },
    onError: () => toast.error('No se pudo asignar. Inténtalo de nuevo.'),
  })

  // Who can take it now first: available agents with room, least loaded.
  const candidates = agents
    .filter((a) => a.memberId !== waiting.assignee?.memberId)
    .sort(
      (a, b) => presenceRank(a) - presenceRank(b) || a.openCases - b.openCases
    )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size='sm'
          variant='ghost'
          className='h-8'
          disabled={assign.isPending}
        >
          <UserRoundPlus className='size-3.5' aria-hidden />
          {waiting.assignee ? 'Reasignar' : 'Asignar'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-60'>
        <DropdownMenuLabel className='text-muted-foreground text-xs font-normal'>
          Agentes disponibles primero
        </DropdownMenuLabel>
        {candidates.length === 0 && (
          <DropdownMenuItem disabled>No hay otros agentes</DropdownMenuItem>
        )}
        {candidates.map((agent) => (
          <DropdownMenuItem
            key={agent.memberId}
            onSelect={() => assign.mutate(agent.memberId)}
            className={cn(
              agent.presence === 'offline' && 'text-muted-foreground'
            )}
          >
            <span className='truncate'>{agent.displayName}</span>
            <span className='text-muted-foreground ms-auto text-xs tabular-nums'>
              {agent.openCases}
              {agent.capacity ? `/${agent.capacity}` : ''}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function presenceRank(agent: AgentFloorRow): number {
  const full = agent.capacity !== null && agent.openCases >= agent.capacity
  if (agent.presence === 'available' && !full) return 0
  if (agent.presence === 'available') return 1
  if (agent.presence === 'away') return 2
  return 3
}
