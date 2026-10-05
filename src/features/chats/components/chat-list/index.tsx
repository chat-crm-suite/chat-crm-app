import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getChatList,
  getNeedsResponseChats,
  getUnassignedChats,
} from '@/services/chat.service'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Chat, ChatListView } from '../../types/chat.domain'
import { ChatListHeader } from './chat-list-header'
import { ChatListItem } from './chat-list-item'

export const ChatList = () => {
  const [search, setSearch] = useState('')
  const [view, setView] = useState<ChatListView>('inbox')

  const { data: inbox = [] } = useQuery({
    queryKey: ['chat', 'list'],
    queryFn: getChatList,
    placeholderData: (prev) => prev,
    enabled: view === 'inbox',
  })

  const { data: queue = [] } = useQuery({
    queryKey: ['chat', 'unassigned'],
    queryFn: getUnassignedChats,
    placeholderData: (prev) => prev,
    enabled: view === 'queue',
  })

  const { data: needsResponse = [] } = useQuery({
    queryKey: ['chat', 'needsResponse'],
    queryFn: () => getNeedsResponseChats(),
    placeholderData: (prev) => prev,
    enabled: view === 'needs-response',
  })

  const chats: Chat[] =
    view === 'inbox'
      ? inbox
      : view === 'queue'
        ? queue.map((chat) => ({ ...chat, isUnassigned: true }))
        : needsResponse

  const filterFun = ({ customer }: Chat) => {
    if (search.trim() === '') return true
    const term = search.trim().toLowerCase()
    return [customer.displayName, customer.phone].some((value) =>
      value?.toLowerCase().includes(term)
    )
  }

  const filtered = chats.filter(filterFun)

  return (
    <div className='flex w-full flex-col gap-2 sm:w-56 lg:w-72 2xl:w-80'>
      <ChatListHeader
        searchState={{ search, setSearch }}
        viewState={{ view, setView }}
      />

      <ScrollArea className='-mx-3 h-full overflow-scroll p-3'>
        {filtered.map((chatUsr) => {
          return <ChatListItem key={chatUsr.id} chat={chatUsr} />
        })}

        {filtered.length === 0 && (
          <p className='text-muted-foreground p-4 text-center text-xs'>
            {view === 'inbox' && 'No tenés chats asignados.'}
            {view === 'queue' && 'No hay chats sin asignar.'}
            {view === 'needs-response' && 'No hay chats sin respuesta.'}
          </p>
        )}
      </ScrollArea>
    </div>
  )
}
