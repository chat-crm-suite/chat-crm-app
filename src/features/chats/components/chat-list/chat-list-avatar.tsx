import { User } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { Chat } from '../../types/chat.domain'

export const ChatListAvatar = ({
  customer,
}: {
  customer: Chat['customer']
}) => (
  <Avatar>
    <AvatarFallback className='font-bold'>
      {customer?.displayName?.charAt(0) || <User />}
    </AvatarFallback>
  </Avatar>
)
