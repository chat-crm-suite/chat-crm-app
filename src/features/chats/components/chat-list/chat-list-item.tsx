import { parsePhoneNumber } from 'react-phone-number-input'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useChats } from '../../contexts/chats.provider'
import {
  formatFullStamp,
  formatRelativeTime,
  formatWaitingTime,
  urgencyTier,
  type UrgencyTier,
} from '../../lib/list-time'
import type { Chat } from '../../types/chat.domain'
import { ChatListAvatar } from './chat-list-avatar'
import { ChatPreview } from './chat-preview'

const TICK: Record<UrgencyTier, string> = {
  quiet: 'bg-transparent',
  normal: 'bg-muted-foreground/40',
  warning: 'bg-warning',
  critical: 'bg-destructive',
}

const TIME: Record<UrgencyTier, string> = {
  quiet: 'text-muted-foreground',
  normal: 'text-muted-foreground',
  warning: 'text-foreground font-medium',
  critical: 'text-destructive font-medium',
}

const customerName = (customer: Chat['customer']) =>
  customer?.displayName ??
  parsePhoneNumber(customer?.phone ?? '', 'PE')?.formatNational() ??
  'Desconocido'

export const ChatListItem = ({
  chat,
  waiting = false,
  now,
}: {
  chat: Chat
  /** Queue / needs-response rows encode waiting; inbox rows stay quiet. */
  waiting?: boolean
  now: number
}) => {
  const { chatSelected, setChatSelected, setMobile } = useChats()
  const selected = chatSelected?.id === chat.id

  const at =
    (waiting ? chat.waitingSince : null) ??
    chat.preview?.datetime ??
    chat.createdAt
  const tier = waiting ? urgencyTier(at, now) : 'quiet'
  const time = waiting
    ? formatWaitingTime(at, now)
    : formatRelativeTime(at, now)

  return (
    <button
      type='button'
      aria-current={selected ? 'true' : undefined}
      onClick={() => {
        setChatSelected(chat)
        setMobile(true)
      }}
      className={cn(
        'group relative w-full rounded-md px-2 py-2 text-start text-sm',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]',
        selected && 'bg-muted'
      )}
    >
      <span
        aria-hidden='true'
        className={cn(
          'bg-primary absolute inset-y-1.5 start-0 w-0.5 rounded-full transition-opacity motion-reduce:transition-none',
          selected ? 'opacity-100' : 'opacity-0'
        )}
      />

      <div className='grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-2'>
        <ChatListAvatar customer={chat.customer} />

        <div className='flex min-w-0 flex-col items-start gap-0.5'>
          <span className='w-full truncate font-medium'>
            {customerName(chat.customer)}
          </span>

          <ChatPreview preview={chat.preview} />

          {chat.isUnassigned ? (
            <Badge
              variant='secondary'
              className='mt-px h-4 px-1.5 py-0 text-[10px]'
            >
              Sin asignar
            </Badge>
          ) : chat.member ? (
            <span className='text-muted-foreground w-full truncate text-[11px]'>
              {chat.member.username
                ? `Asignado a @${chat.member.username}`
                : 'Asignado'}
            </span>
          ) : null}
        </div>

        <div className='flex w-14 shrink-0 flex-col items-end justify-between gap-1'>
          <span
            title={formatFullStamp(at)}
            className={cn('text-[11px] tabular-nums', TIME[tier])}
          >
            {time}
          </span>
          <span
            aria-hidden='true'
            className={cn('h-3 w-[3px] rounded-full', TICK[tier])}
          />
        </div>
      </div>
    </button>
  )
}
