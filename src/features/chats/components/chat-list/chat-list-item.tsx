import { ArrowRightLeft } from 'lucide-react'
import { parsePhoneNumber } from 'react-phone-number-input'
import { cn } from '@/lib/utils'
import { useChats } from '../../contexts/chats.context'
import { CHANNEL_LABEL, copy } from '../../copy'
import {
  formatFullStamp,
  formatRelativeTime,
  formatWaitingTime,
  urgencyTier,
  type UrgencyTier,
} from '../../lib/list-time'
import type { Chat } from '../../types/chat.domain'
import { ChannelIcon } from '../channel-icon'
import { STATUS_META } from '../conversation/status-meta'
import { MemberAvatar } from '../member-avatar'
import { ChatListAvatar } from './chat-list-avatar'
import { ChatPreview } from './chat-preview'

const TIME: Record<UrgencyTier, string> = {
  quiet: 'text-muted-foreground',
  normal: 'text-muted-foreground',
  warning: 'text-foreground font-medium',
  critical: 'text-destructive font-medium',
}

const customerName = (customer: Chat['customer']) =>
  customer?.displayName ??
  parsePhoneNumber(customer?.phone ?? '', 'PE')?.formatNational() ??
  copy.unknownCustomer

export const ChatListItem = ({
  chat,
  waiting = false,
  showAssignee = false,
  now,
}: {
  chat: Chat
  /** Queue / needs-response rows encode waiting; the others stay quiet. */
  waiting?: boolean
  /** "Todos": the owner's mini avatar (or "Sin asignar"). */
  showAssignee?: boolean
  now: number
}) => {
  const { chatSelected, setChatSelected, setMobile, updateChat } = useChats()
  const selected = chatSelected?.id === chat.id

  const at =
    (waiting ? chat.waitingSince : null) ??
    chat.preview?.datetime ??
    chat.createdAt
  const tier = waiting ? urgencyTier(at, now) : 'quiet'
  const time = waiting
    ? formatWaitingTime(at, now)
    : formatRelativeTime(at, now)
  const status = chat.status === 'open' ? null : STATUS_META[chat.status]
  const channelType = chat.channel?.type ?? chat.channelType
  const unread = selected ? 0 : chat.unread
  const showMeta =
    !!status || !!chat.transfer || showAssignee || (waiting && !chat.assignee)

  return (
    <button
      type='button'
      aria-current={selected ? 'true' : undefined}
      onClick={() => {
        setChatSelected(chat)
        setMobile(true)
        if (chat.unread) updateChat(chat.id, { unread: 0 })
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

      <div className='grid grid-cols-[auto_minmax(0,1fr)] gap-x-2.5'>
        <span className='relative h-fit'>
          <ChatListAvatar customer={chat.customer} />
          <span
            title={chat.channel?.name || CHANNEL_LABEL[channelType]}
            className='bg-card text-muted-foreground ring-card absolute -end-1 -bottom-1 grid size-4 place-items-center rounded-full ring-2'
          >
            <ChannelIcon type={channelType} className='size-2.5' />
            <span className='sr-only'>{CHANNEL_LABEL[channelType]}</span>
          </span>
        </span>

        <div className='flex min-w-0 flex-col gap-0.5'>
          <div className='flex items-baseline justify-between gap-2'>
            <span
              className={cn(
                'truncate',
                unread ? 'font-semibold' : 'font-medium'
              )}
            >
              {customerName(chat.customer)}
            </span>
            <span
              title={formatFullStamp(at)}
              className={cn('shrink-0 text-[11px] tabular-nums', TIME[tier])}
            >
              {time}
            </span>
          </div>

          <div className='flex items-center justify-between gap-2'>
            <ChatPreview preview={chat.preview} />
            {unread > 0 && (
              <span
                aria-label={`${unread} sin leer`}
                className='bg-primary text-primary-foreground ms-auto grid h-4 min-w-4 shrink-0 place-items-center rounded-full px-1 text-[10px] font-semibold tabular-nums'
              >
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </div>

          {showMeta && (
            <div className='text-muted-foreground mt-0.5 flex min-w-0 items-center gap-2 text-[11px]'>
              {status && (
                <span className='flex items-center gap-1'>
                  <span
                    aria-hidden
                    className={cn('size-1.5 rounded-full', status.dot)}
                  />
                  {status.label}
                </span>
              )}
              {chat.transfer && (
                <span className='text-foreground flex items-center gap-0.5 rounded-sm border px-1 font-medium'>
                  <ArrowRightLeft className='size-2.5' aria-hidden />
                  {copy.transferred}
                </span>
              )}
              {(showAssignee || waiting) &&
                (chat.assignee ? (
                  showAssignee && (
                    <span className='ms-auto flex min-w-0 items-center gap-1'>
                      <MemberAvatar
                        name={chat.assignee.name}
                        className='size-4'
                      />
                      <span className='truncate'>{chat.assignee.name}</span>
                    </span>
                  )
                ) : (
                  <span className='bg-secondary text-secondary-foreground rounded-sm px-1 font-medium'>
                    {copy.unassigned}
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
