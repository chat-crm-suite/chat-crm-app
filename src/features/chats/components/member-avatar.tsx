import type { PresenceState } from '@chat-crm/contracts'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PRESENCE_LABEL } from '../copy'
import { initials } from './conversation/identity'

const PRESENCE_DOT: Record<PresenceState, string> = {
  available: 'bg-(--positive)',
  away: 'bg-warning',
  offline: 'bg-muted-foreground/50',
}

/** Initials avatar of a team member, with an optional live presence dot. */
export function MemberAvatar({
  name,
  presence,
  className,
}: {
  name: string
  presence?: PresenceState
  className?: string
}) {
  return (
    <span className='relative inline-flex shrink-0'>
      <Avatar className={cn('size-6', className)}>
        <AvatarFallback className='text-[10px] font-semibold'>
          {initials(name) || '?'}
        </AvatarFallback>
      </Avatar>
      {presence && (
        <span
          role='img'
          aria-label={PRESENCE_LABEL[presence]}
          className={cn(
            'ring-card absolute -end-0.5 -bottom-0.5 size-2.5 rounded-full ring-2',
            PRESENCE_DOT[presence]
          )}
        />
      )}
    </span>
  )
}
