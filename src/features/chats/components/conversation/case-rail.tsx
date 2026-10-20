import { useState, type ReactNode } from 'react'
import { useDirection } from '@radix-ui/react-direction'
import { channelCapabilities } from '@chat-crm/contracts'
import {
  ChevronDown,
  Clock3,
  LayoutTemplate,
  Phone,
  Plus,
  UserRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/use-media-query'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useCompleteTask, useTasks } from '@/features/tasks/task-queries'
import { PRIORITY_LABEL, copy } from '../../copy'
import { useNow } from '../../hooks/use-now'
import type { CaseActions } from '../../lib/conversation-assignment'
import {
  conversationWindowState,
  formatServiceWindowRemaining,
} from '../../lib/service-window'
import type { Chat, ChatMessage, ChatSentiment } from '../../types/chat.domain'
import { ChannelIcon } from '../channel-icon'
import { MemberAvatar } from '../member-avatar'
import { PANE_HEADER } from './case-header'
import { formatPhone, initials } from './identity'
import { STATUS_META } from './status-meta'
import { useToneMode } from './tone-mode'
import { ToneSummary } from './tone-summary'

/**
 * Phone body of the case detail, mirrored from the `tablet` breakpoint in
 * `theme.css`: below 768px the chat is a full-width overlay, so the detail
 * opens as a bottom sheet within thumb reach instead of a side panel.
 */
export const RAIL_PHONE_MEDIA_QUERY = '(max-width: 767px)'

/** Below this the countdown stops being background noise. */
export const SERVICE_WINDOW_WARNING_MS = 4 * 60 * 60 * 1000

function RailSection({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useState(true)

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <section className='border-b last:border-b-0'>
        <div className='flex items-center gap-1 px-4 pt-3'>
          <CollapsibleTrigger className='text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 -ms-1 flex min-h-8 flex-1 items-center gap-1 rounded-sm px-1 text-[11px] font-semibold tracking-wide uppercase outline-none focus-visible:ring-[3px] max-sm:min-h-11'>
            <ChevronDown
              aria-hidden
              className={cn(
                'size-3.5 transition-transform motion-reduce:transition-none',
                !open && '-rotate-90'
              )}
            />
            {title}
          </CollapsibleTrigger>
          {action}
        </div>
        <CollapsibleContent className='space-y-2.5 px-4 pt-1.5 pb-4'>
          {children}
        </CollapsibleContent>
      </section>
    </Collapsible>
  )
}

function RailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='flex min-h-7 items-center justify-between gap-3 text-xs'>
      <dt className='text-muted-foreground shrink-0'>{label}</dt>
      <dd className='flex min-w-0 items-center justify-end text-end font-medium'>
        {children}
      </dd>
    </div>
  )
}

/**
 * Reply window of the conversation: the server's `windowExpiresAt` merged with
 * the live thread (a fresh inbound reopens it before the list refetches). The
 * expired state is the only place the rail spends a semantic color, and it
 * points straight at the template picker.
 */
function WindowMeter({
  chat,
  messages,
  onPickTemplate,
}: {
  chat: Chat
  messages: ChatMessage[]
  onPickTemplate?: () => void
}) {
  // Re-sample the clock while mounted, so an open chat flips to expired when
  // the boundary passes instead of freezing.
  const now = useNow(60_000)
  const capabilities = channelCapabilities(
    chat.channel?.type ?? chat.channelType
  )
  const windowMs = capabilities?.replyWindowMs
  const state = conversationWindowState(chat, messages, now, windowMs)
  const hours = windowMs ? Math.round(windowMs / 3_600_000) : 0

  if (state.kind === 'unlimited') {
    return <p className='text-muted-foreground text-xs'>{copy.windowNoLimit}</p>
  }

  if (state.kind === 'none' || state.kind === 'expired') {
    return (
      <div className='space-y-2'>
        <p
          className={cn(
            'text-xs',
            state.kind === 'expired'
              ? 'font-medium text-(--negative)'
              : 'text-muted-foreground'
          )}
        >
          {state.kind === 'expired' ? copy.windowExpired : copy.windowNone}
        </p>
        {capabilities?.supportsTemplates && onPickTemplate && (
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-11 w-full sm:h-8'
            onClick={onPickTemplate}
          >
            <LayoutTemplate className='size-3.5' />
            {copy.useTemplate}
          </Button>
        )}
      </div>
    )
  }

  const isEnding = state.remainingMs <= SERVICE_WINDOW_WARNING_MS

  return (
    <div className='space-y-1.5'>
      <div className='flex items-baseline justify-between text-xs'>
        <span
          className={cn(
            'flex items-center gap-1.5',
            isEnding ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          <Clock3 className='size-3.5' aria-hidden />
          {copy.windowLabel(hours)}
        </span>
        <span
          className={cn(
            'tabular-nums',
            isEnding ? 'font-semibold' : 'font-medium'
          )}
        >
          {formatServiceWindowRemaining(state.remainingMs)}
        </span>
      </div>
      <Progress
        value={(state.remainingMs / (windowMs ?? 1)) * 100}
        className='h-1.5'
        aria-label={`${copy.windowLabel(hours)} restante`}
      />
    </div>
  )
}

/** Open tasks linked to this chat, with a one-tap "Completar". */
function ChatTasks({ conversationId }: { conversationId: string }) {
  const tasks = useTasks({ conversationId, status: 'open' })
  const complete = useCompleteTask()

  if (tasks.isPending) return <Skeleton className='h-8 w-full' />
  if (tasks.isError) {
    return (
      <p role='alert' className='text-muted-foreground text-xs'>
        {copy.tasksError}
      </p>
    )
  }
  if (tasks.data.length === 0) {
    return <p className='text-muted-foreground text-xs'>{copy.tasksEmpty}</p>
  }

  return (
    <ul className='space-y-1'>
      {tasks.data.map((task) => (
        <li key={task.id} className='flex items-start gap-2 text-xs'>
          <Checkbox
            className='mt-0.5'
            aria-label={`Completar: ${task.title}`}
            disabled={complete.isPending}
            onCheckedChange={(checked) => {
              if (checked) complete.mutate(task)
            }}
          />
          <span className='min-w-0 flex-1'>
            <span className='block truncate font-medium'>{task.title}</span>
            {task.dueAt && (
              <span
                className={cn(
                  'tabular-nums',
                  task.overdue ? 'text-destructive' : 'text-muted-foreground'
                )}
              >
                {task.dueAt.toLocaleString('es', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}

export type CaseRailContentProps = {
  chat: Chat
  messages: ChatMessage[]
  sentiment?: ChatSentiment
  /** Sentiment section only while the IA is available. */
  showSentiment?: boolean
  actions: Pick<CaseActions, 'canTake' | 'isMine'>
  onTake: () => void
  taking?: boolean
  onPickTemplate?: () => void
  onCreateTask?: () => void
  onViewContact?: () => void
}

/**
 * Single body shared by the inline column and the sheet shells, so the detail
 * never forks between viewports.
 */
function CaseRailContent({
  chat,
  messages,
  sentiment,
  showSentiment = false,
  actions,
  onTake,
  taking = false,
  onPickTemplate,
  onCreateTask,
  onViewContact,
}: CaseRailContentProps) {
  const [mode] = useToneMode()
  const customerName = chat.customer?.displayName ?? copy.customerFallback
  const phone = formatPhone(chat.customer?.phone)
  const status = STATUS_META[chat.status]
  const channelType = chat.channel?.type ?? chat.channelType

  return (
    <>
      <RailSection title={copy.sectionContact}>
        <div className='flex items-center gap-3'>
          <Avatar className='size-10'>
            <AvatarFallback className='text-sm font-semibold'>
              {initials(customerName)}
            </AvatarFallback>
          </Avatar>
          <div className='min-w-0 flex-1'>
            <p className='truncate text-sm font-semibold'>{customerName}</p>
            {phone && (
              <p className='text-muted-foreground flex items-center gap-1 text-xs'>
                <Phone className='size-3' aria-hidden />
                {phone}
              </p>
            )}
          </div>
          {onViewContact && (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='h-11 px-2 text-xs sm:h-7'
              onClick={onViewContact}
            >
              <UserRound className='size-3.5' />
              {copy.viewProfile}
            </Button>
          )}
        </div>
      </RailSection>

      <RailSection title={copy.sectionWindow}>
        <WindowMeter
          chat={chat}
          messages={messages}
          onPickTemplate={onPickTemplate}
        />
      </RailSection>

      <RailSection title={copy.sectionCase}>
        <dl className='space-y-1'>
          <RailRow label={copy.rowStatus}>
            <Badge variant='secondary' className={status.className}>
              {status.label}
            </Badge>
          </RailRow>
          <RailRow label={copy.rowOwner}>
            {chat.assignee ? (
              <span className='flex min-w-0 items-center gap-1.5'>
                <MemberAvatar name={chat.assignee.name} className='size-5' />
                <span className='truncate'>
                  {actions.isMine ? copy.ownerMe : chat.assignee.name}
                </span>
              </span>
            ) : actions.canTake ? (
              <span className='flex items-center gap-2'>
                <span className='text-muted-foreground text-xs font-normal'>
                  {copy.unassigned}
                </span>
                <Button
                  type='button'
                  size='sm'
                  className='h-11 px-2.5 text-xs sm:h-7'
                  onClick={onTake}
                  disabled={taking}
                >
                  {taking ? copy.taking : copy.takeChat}
                </Button>
              </span>
            ) : (
              copy.unassigned
            )}
          </RailRow>
          {chat.priority && (
            <RailRow label={copy.rowPriority}>
              <Badge variant='outline'>{PRIORITY_LABEL[chat.priority]}</Badge>
            </RailRow>
          )}
          <RailRow label={copy.rowChannel}>
            <span className='flex min-w-0 items-center gap-1.5'>
              <ChannelIcon type={channelType} />
              <span className='truncate'>{chat.channel?.name}</span>
            </span>
          </RailRow>
          {chat.transfer && (
            <RailRow label={copy.rowTransfer}>
              <span className='truncate'>{chat.transfer.fromName ?? '—'}</span>
            </RailRow>
          )}
        </dl>
        {chat.transfer?.note && (
          <p className='bg-muted/60 rounded-md px-2.5 py-1.5 text-xs'>
            {chat.transfer.note}
          </p>
        )}
      </RailSection>

      <RailSection
        title={copy.sectionTasks}
        action={
          onCreateTask && (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='size-11 sm:size-7'
              aria-label={copy.newTask}
              title={copy.newTask}
              onClick={onCreateTask}
            >
              <Plus className='size-4' />
            </Button>
          )
        }
      >
        <ChatTasks conversationId={chat.id} />
      </RailSection>

      {showSentiment && sentiment && mode !== 'off' && (
        <RailSection title={copy.sectionSentiment}>
          <ToneSummary sentiment={sentiment} />
        </RailSection>
      )}
    </>
  )
}

/**
 * Case detail, one body in three shells (ADR-0004):
 * - below `tablet` (768px) a bottom sheet, within thumb reach;
 * - from `tablet` up to the point where the pane can hold the rail, a side
 *   sheet opened from the header button;
 * - once the conversation pane is wide enough (`@rail/card`, see `theme.css`),
 *   the inline `w-72` column: same surface, a start border only.
 */
export function CaseRail({
  open = false,
  onOpenChange,
  className,
  ...content
}: CaseRailContentProps & {
  /** Controlled sheet state; the header button opens it while not inline. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}) {
  const isPhone = useMediaQuery(RAIL_PHONE_MEDIA_QUERY)
  // Radix falls back to `ltr`, so the shell still renders without a provider.
  const dir = useDirection()
  // Sheet sides are physical: mirror the inline rail's logical border in RTL.
  const side = isPhone ? 'bottom' : dir === 'rtl' ? 'left' : 'right'

  return (
    <>
      <aside
        aria-label={copy.caseDetail}
        className={cn(
          '@rail/card:flex hidden w-72 shrink-0 flex-col border-s',
          className
        )}
      >
        <div className={cn(PANE_HEADER, 'flex items-center px-4')}>
          <h2 className='text-sm font-semibold'>{copy.railTitle}</h2>
        </div>
        <div className='min-h-0 flex-1 overflow-y-auto'>
          <CaseRailContent {...content} />
        </div>
      </aside>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={side}
          aria-describedby={undefined}
          className={cn(
            'gap-0 overflow-y-auto overscroll-contain p-0',
            // The shared Sheet animates unconditionally; respect the user's
            // reduced-motion preference at least on this surface.
            'motion-reduce:animate-none! motion-reduce:duration-0!',
            side === 'bottom'
              ? 'max-h-[85dvh] rounded-t-2xl pb-[max(0.5rem,env(safe-area-inset-bottom))]'
              : 'w-full sm:max-w-sm'
          )}
        >
          <div className={cn(PANE_HEADER, 'flex items-center px-4')}>
            <SheetTitle className='text-sm font-semibold'>
              {copy.caseDetail}
            </SheetTitle>
          </div>
          <CaseRailContent {...content} />
        </SheetContent>
      </Sheet>
    </>
  )
}
