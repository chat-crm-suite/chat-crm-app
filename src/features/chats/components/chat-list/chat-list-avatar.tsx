import { User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Chat } from '../../types/chat.domain'

export const ChatListAvatar = ({ client }: { client: Chat['client'] }) => (
  <Avatar>
    <AvatarImage
      src={client?.username ?? undefined}
      alt={client?.username ?? undefined}
    />
    <AvatarFallback className='font-bold'>
      {client?.username?.charAt(0) || <User />}
    </AvatarFallback>
  </Avatar>
)
