import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { claimChat } from '@/services/chat.service'
import {
  WORK_SIGNAL_KINDS,
  type WorkQueueCounts,
  type WorkSignal,
  type WorkSignalKind,
} from '@chat-crm/contracts'
import { CircleCheckBig, Clock3, Inbox, MessageSquareReply } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChannelIcon } from '@/features/chats/components/channel-icon'
import { useNow } from '@/features/chats/hooks/use-now'
import { chatKeys } from '@/features/chats/lib/query-keys'
import { LoadError } from '@/features/workspace/components/load-error'
import { SIGNAL_HINT, SIGNAL_LABEL, copy } from '../copy'
import { workQueueKeys } from '../task-queries'

const SIGNAL_ICON: Record<WorkSignalKind, typeof Inbox> = {
  unassigned: Inbox,
  needs_response: MessageSquareReply,
  window_expiring: Clock3,
}

const COUNT_KEY: Record<WorkSignalKind, keyof WorkQueueCounts> = {
  unassigned: 'unassigned',
  needs_response: 'needsResponse',
  window_expiring: 'windowExpiring',
}

/** Compact span: `3 min`, `2 h`, `4 d`. */
export function formatSpan(ms: number): string {
  const minutes = Math.max(1, Math.round(Math.abs(ms) / 60_000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h`
  return `${Math.floor(hours / 24)} d`
}

const customerLabel = (signal: WorkSignal) =>
  signal.customer.displayName ?? signal.customer.phone ?? 'Cliente'

function SignalRow({
  signal,
  now,
  showAssignee,
}: {
  signal: WorkSignal
  now: number
  showAssignee: boolean
}) {
  const queryClient = useQueryClient()
  const take = useMutation({
    mutationFn: () => claimChat(signal.conversationId),
    onSuccess: () => {
      toast.success(copy.taken)
      void queryClient.invalidateQueries({ queryKey: workQueueKeys.all })
      void queryClient.invalidateQueries({ queryKey: chatKeys.lists })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, copy.takeError)),
  })
  const Icon = SIGNAL_ICON[signal.kind]
  const waiting =
    signal.kind === 'window_expiring' && signal.windowExpiresAt
      ? `cierra en ${formatSpan(signal.windowExpiresAt.getTime() - now)}`
      : `hace ${formatSpan(now - signal.since.getTime())}`

  return (
    <li className='flex items-center gap-3 py-2.5 max-sm:flex-wrap'>
      <span
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-full',
          signal.kind === 'window_expiring' ? 'bg-warning/15' : 'bg-muted'
        )}
      >
        <Icon className='size-4' aria-hidden />
      </span>
      <div className='min-w-0 flex-1'>
        <p className='flex items-center gap-1.5 text-sm'>
          <span className='truncate font-medium'>{customerLabel(signal)}</span>
          <ChannelIcon
            type={signal.channelType}
            className='text-muted-foreground'
          />
        </p>
        <p className='text-muted-foreground truncate text-xs'>
          {SIGNAL_LABEL[signal.kind]} · {waiting}
          {showAssignee && signal.assignee && ` · ${signal.assignee.name}`}
        </p>
      </div>
      <div className='flex shrink-0 gap-1.5 max-sm:w-full max-sm:justify-end'>
        {signal.kind === 'unassigned' && (
          <Button
            size='sm'
            variant='secondary'
            className='h-11 sm:h-8'
            disabled={take.isPending}
            onClick={() => take.mutate()}
          >
            {copy.take}
          </Button>
        )}
        <Button asChild size='sm' variant='outline' className='h-11 sm:h-8'>
          <Link to='/chats' search={{ conversation: signal.conversationId }}>
            {copy.openChat}
          </Link>
        </Button>
      </div>
    </li>
  )
}

/**
 * "Avisos": live alerts derived by the API (never stored): queue, chats
 * waiting for a reply, windows about to close. Counts on top, actionable
 * rows below.
 */
export function SignalsPanel({
  signals,
  counts,
  loading,
  error,
  onRetry,
  showAssignee = false,
}: {
  signals: WorkSignal[]
  counts?: WorkQueueCounts
  loading?: boolean
  error?: boolean
  onRetry: () => void
  showAssignee?: boolean
}) {
  const now = useNow()

  return (
    <section
      aria-labelledby='signals-title'
      className='bg-card rounded-lg border'
    >
      <header className='flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3'>
        <h2 id='signals-title' className='text-sm font-semibold'>
          {copy.signalsTitle}
        </h2>
        <dl className='flex flex-wrap gap-2'>
          {WORK_SIGNAL_KINDS.map((kind) => (
            <div
              key={kind}
              title={SIGNAL_HINT[kind]}
              className='bg-muted/60 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs'
            >
              <dt className='text-muted-foreground'>{SIGNAL_LABEL[kind]}</dt>
              <dd className='font-semibold tabular-nums'>
                {counts ? counts[COUNT_KEY[kind]] : '—'}
              </dd>
            </div>
          ))}
        </dl>
      </header>
      <div className='px-4'>
        {loading ? (
          <div className='space-y-2 py-3'>
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-10 w-full' />
          </div>
        ) : error ? (
          <LoadError title={copy.signalsError} onRetry={onRetry} />
        ) : signals.length === 0 ? (
          <p className='text-muted-foreground flex items-center gap-2 py-6 text-sm'>
            <CircleCheckBig className='size-4' aria-hidden />
            {copy.signalsEmpty}
          </p>
        ) : (
          <ul className='divide-y'>
            {signals.map((signal) => (
              <SignalRow
                key={`${signal.kind}-${signal.conversationId}`}
                signal={signal}
                now={now}
                showAssignee={showAssignee}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
