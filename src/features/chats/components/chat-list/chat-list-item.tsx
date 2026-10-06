import { Fragment } from 'react'
import { parsePhoneNumber } from 'react-phone-number-input'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useChats } from '../../contexts/chats.provider'
import type { Chat } from '../../types/chat.domain'
import { ChatListAvatar } from './chat-list-avatar'
import { ChatPreview } from './chat-preview'

export const ChatListItem = ({ chat }: { chat: Chat }) => {
  const { chatSelected, setChatSelected, setMobile } = useChats()

  return (
    <Fragment key={chat.id}>
      <button
        type='button'
        className={cn(
          'group hover:bg-accent hover:text-accent-foreground',
          `flex w-full rounded-md px-2 py-2 text-start text-sm`,
          chatSelected?.id === chat.id && 'sm:bg-muted'
        )}
        onClick={() => {
          setChatSelected(chat)
          setMobile(true)
        }}
      >
        <div className='flex gap-2'>
          <ChatListAvatar customer={chat.customer} />
          <div>
            <span className='col-start-2 row-span-2 font-medium'>
              {chat.customer?.displayName ??
                parsePhoneNumber(
                  chat.customer?.phone ?? '',
                  'PE'
                )?.formatNational() ??
                'unknown'}
              {chat.isUnassigned && (
                <Badge variant='secondary' className='ms-2 text-[10px]'>
                  Sin asignar
                </Badge>
              )}
            </span>
            {chat.member && (
              <span className='text-muted-foreground block text-[11px]'>
                Asignado a @{chat.member.username}
              </span>
            )}
            <ChatPreview preview={chat.preview} isMe={!!chat.customer.id} />
          </div>
        </div>
      </button>
      <Separator className='my-1' />
    </Fragment>
  )
}
