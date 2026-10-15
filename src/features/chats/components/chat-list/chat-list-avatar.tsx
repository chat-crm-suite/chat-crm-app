import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { customerInitials, tintIndex } from '../../lib/monogram'
import type { Chat } from '../../types/chat.domain'

const tintStyle = (tint: number) => ({
  backgroundColor: `var(--avatar-tint-${tint}-bg)`,
  color: `var(--avatar-tint-${tint}-fg)`,
})

export const ChatListAvatar = ({
  customer,
  className,
}: {
  customer: Chat['customer']
  className?: string
}) => {
  const tint =
    tintIndex(customer?.displayName ?? customer?.phone ?? customer?.id ?? '') + 1

  return (
    <Avatar className={cn('size-9', className)}>
      <AvatarFallback
        aria-hidden='true'
        className='text-xs font-semibold'
        style={tintStyle(tint)}
      >
        {customerInitials({
          displayName: customer?.displayName,
          phone: customer?.phone,
        })}
      </AvatarFallback>
    </Avatar>
  )
}
