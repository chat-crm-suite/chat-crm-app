import type { ReactNode } from 'react'
import { ArrowLeft, CircleCheck, Info, MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { isConversationUnassigned } from '../../lib/conversation-assignment'
import type { Chat, ChatSentiment } from '../../types/chat.domain'
import { formatPhone, initials, shortConversationId } from './identity'
import { STATUS_META } from './status-meta'
import { ToneControl } from './tone-control'

export type CaseHeaderProps = {
  chat: Chat
  sentiment?: ChatSentiment
  onTake: () => void
  taking?: boolean
  onBack: () => void
  /**
   * Opens the case detail sheet below `desktop`, where the rail is not
   * inline. The button hides itself from `desktop` up.
   */
  onOpenDetails?: () => void
  /**
   * Extra action widgets that need their own data (the assignee picker),
   * rendered between Take and Resolve so the header stays a single row.
   */
  children?: ReactNode
}

/**
 * Conversation header: identity block (name + real status pill, short case id
 * and phone) plus the case actions. Status copy is shared with the case rail;
 * Resolve and the options menu have no API behind them yet, so they ship
 * visibly disabled with a "Próximamente" hint instead of looking functional.
 * Below `desktop` the header also carries the only trigger for the case
 * detail sheet, since the rail is not inline there.
 */
export function CaseHeader({
  chat,
  sentiment,
  onTake,
  taking = false,
  onBack,
  onOpenDetails,
  children,
}: CaseHeaderProps) {
  const customerName = chat.customer?.displayName ?? 'Cliente'
  const phone = formatPhone(chat.customer?.phone)
  const status = STATUS_META[chat.status]

  return (
    <header className='bg-card flex flex-none items-center justify-between gap-3 rounded-t-md border-b py-2.5 ps-[max(0.75rem,env(safe-area-inset-left))] pe-[max(0.75rem,env(safe-area-inset-right))] sm:ps-4 sm:pe-4'>
      <div className='flex min-w-0 items-center gap-2.5'>
        <Button
          size='icon'
          variant='ghost'
          className='-ms-2 size-11 sm:hidden'
          aria-label='Volver a la lista'
          onClick={onBack}
        >
          <ArrowLeft className='rtl:rotate-180' />
        </Button>
        <Avatar className='size-8 lg:size-9'>
          <AvatarFallback className='text-xs font-semibold'>
            {initials(customerName)}
          </AvatarFallback>
        </Avatar>
        <div className='min-w-0'>
          <p className='flex items-center gap-2 text-sm'>
            <span className='truncate font-semibold'>{customerName}</span>
            <Badge
              variant='secondary'
              className={cn(
                'rounded-full text-[11px] font-semibold',
                status.className
              )}
            >
              {status.label}
            </Badge>
          </p>
          <p className='text-muted-foreground truncate text-xs'>
            <span className='font-mono'>#{shortConversationId(chat.id)}</span>
            {phone && (
              <>
                {' · '}
                <span>{phone}</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className='flex shrink-0 items-center gap-1.5'>
        <ToneControl sentiment={sentiment} />
        {isConversationUnassigned(chat) && (
          <Button
            size='sm'
            className='h-11 rounded-full px-4 text-xs sm:h-8 sm:px-3'
            onClick={onTake}
            disabled={taking}
          >
            {taking ? 'Tomando…' : 'Tomar'}
          </Button>
        )}
        {children}
        {/* TODO(#11): enable when the API close endpoint ships. On phones the
            disabled placeholder yields its slot to the case-detail trigger, so
            the customer name keeps room in the single header row; the
            "coming soon" signal stays in the options menu. */}
        <Button
          type='button'
          size='sm'
          className='h-11 w-11 justify-center rounded-full px-0 text-xs max-sm:hidden sm:h-8 sm:w-auto sm:px-3'
          disabled
          title='Próximamente: resolver el caso'
          aria-label='Resolver (próximamente)'
        >
          <CircleCheck className='size-3.5' />
          <span className='hidden desktop:inline'>Resolver</span>
        </Button>
        {/* Case detail: the rail is inline from `desktop` up, so this trigger
            only exists where the relationship is a sheet. */}
        {onOpenDetails && (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-11 @rail/card:hidden sm:size-8'
            title='Detalle del caso'
            aria-label='Detalle del caso'
            onClick={onOpenDetails}
          >
            <Info className='size-4' />
          </Button>
        )}
        {/* TODO(#11): list wired case actions here once they exist. */}
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-11 sm:size-8'
          disabled
          title='Próximamente: más acciones del caso'
          aria-label='Más opciones (próximamente)'
        >
          <MoreVertical className='size-4' />
        </Button>
      </div>
    </header>
  )
}
