import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRightLeft, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { copy } from '../../copy'
import type { Chat, ChatSentiment } from '../../types/chat.domain'
import { ChannelChip } from '../channel-icon'
import { formatPhone, initials, shortConversationId } from './identity'
import { STATUS_META } from './status-meta'
import { ToneControl } from './tone-control'

/** Shared pane-header height: list, conversation and rail lines align. */
export const PANE_HEADER = 'h-14 flex-none border-b'

export type CaseHeaderProps = {
  chat: Chat
  sentiment?: ChatSentiment
  /**
   * Sentiment UI only while the IA is available (`useIaStatus`): with the
   * IA off the tone pill never renders, whatever the cached sentiment says.
   */
  showSentiment?: boolean
  onBack: () => void
  /** Opens the case detail sheet while the rail is not inline. */
  onOpenDetails?: () => void
  /** Owner chip (assign / transfer / take / release). */
  assignee?: ReactNode
  /** `Resolver ▾` split button. */
  resolveAction?: ReactNode
  /** ⋮ menu. */
  menu?: ReactNode
}

/**
 * Conversation header: identity (name, status, channel; phone · #id below)
 * and the case actions in one h-14 row, the same height as the list and rail
 * headers so the three panes read as one surface.
 */
export function CaseHeader({
  chat,
  sentiment,
  showSentiment = false,
  onBack,
  onOpenDetails,
  assignee,
  resolveAction,
  menu,
}: CaseHeaderProps) {
  const customerName = chat.customer?.displayName ?? copy.customerFallback
  const phone = formatPhone(chat.customer?.phone)
  const status = STATUS_META[chat.status]

  return (
    <header
      className={cn(
        PANE_HEADER,
        'flex items-center justify-between gap-3 ps-[max(0.75rem,env(safe-area-inset-left))] pe-[max(0.5rem,env(safe-area-inset-right))] sm:px-4'
      )}
    >
      <div className='flex min-w-0 items-center gap-2.5'>
        <Button
          size='icon'
          variant='ghost'
          className='-ms-2 size-11 sm:hidden'
          aria-label={copy.backToList}
          onClick={onBack}
        >
          <ArrowLeft className='rtl:rotate-180' />
        </Button>
        <Avatar className='size-8 max-sm:hidden lg:size-9'>
          <AvatarFallback className='text-xs font-semibold'>
            {initials(customerName)}
          </AvatarFallback>
        </Avatar>
        <div className='min-w-0'>
          <p className='flex min-w-0 items-center gap-1.5 text-sm'>
            <span className='truncate font-semibold'>{customerName}</span>
            <Badge
              variant='secondary'
              className={cn(
                'h-5 shrink-0 rounded-full px-2 text-[11px] font-semibold',
                status.className
              )}
            >
              {status.label}
            </Badge>
            <ChannelChip
              type={chat.channel?.type ?? chat.channelType}
              name={chat.channel?.name}
              className='hidden shrink-0 md:inline-flex'
            />
            {chat.transfer && (
              <Badge
                variant='outline'
                className='hidden h-5 shrink-0 gap-1 rounded-full px-1.5 text-[11px] lg:inline-flex'
                title={
                  chat.transfer.note
                    ? `${chat.transfer.fromName ?? ''}: ${chat.transfer.note}`
                    : undefined
                }
              >
                <ArrowRightLeft className='size-3' aria-hidden />
                {copy.transferred}
              </Badge>
            )}
          </p>
          <p className='text-muted-foreground truncate text-xs'>
            {phone && <span>{phone}</span>}
            {phone && ' · '}
            <span className='font-mono'>#{shortConversationId(chat.id)}</span>
          </p>
        </div>
      </div>

      <div className='flex shrink-0 items-center gap-1.5'>
        {showSentiment && <ToneControl sentiment={sentiment} />}
        {assignee}
        {resolveAction}
        {onOpenDetails && (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='@rail/card:hidden size-11 sm:size-8'
            title={copy.caseDetail}
            aria-label={copy.caseDetail}
            onClick={onOpenDetails}
          >
            <Info className='size-4' />
          </Button>
        )}
        {menu}
      </div>
    </header>
  )
}
