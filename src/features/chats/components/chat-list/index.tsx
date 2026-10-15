import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getChatList,
  getNeedsResponseChats,
  getUnassignedChats,
} from '@/services/chat.service'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNow } from '../../hooks/use-now'
import type { Chat, ChatListView } from '../../types/chat.domain'
import { ChatListHeader } from './chat-list-header'
import { ChatListItem } from './chat-list-item'
import {
  ChatListEmpty,
  ChatListError,
  ChatListSkeleton,
} from './chat-list-states'

export const ChatList = () => {
  const [search, setSearch] = useState('')
  const [view, setView] = useState<ChatListView>('inbox')
  const now = useNow()

  // The three lists stay warm: tab counts are always real and switching views
  // never re-shows a skeleton.
  const inboxQuery = useQuery({
    queryKey: ['chat', 'list'],
    queryFn: getChatList,
    placeholderData: (prev) => prev,
  })

  const queueQuery = useQuery({
    queryKey: ['chat', 'unassigned'],
    queryFn: getUnassignedChats,
    placeholderData: (prev) => prev,
  })

  const needsQuery = useQuery({
    queryKey: ['chat', 'needsResponse'],
    queryFn: () => getNeedsResponseChats(),
    placeholderData: (prev) => prev,
  })

  const activeQuery =
    view === 'inbox' ? inboxQuery : view === 'queue' ? queueQuery : needsQuery

  const chats: Chat[] =
    view === 'inbox'
      ? (inboxQuery.data ?? [])
      : view === 'queue'
        ? (queueQuery.data ?? []).map((chat) => ({
            ...chat,
            isUnassigned: true,
          }))
        : (needsQuery.data ?? [])

  const counts: Record<ChatListView, number | undefined> = {
    inbox: inboxQuery.data?.length,
    queue: queueQuery.data?.length,
    'needs-response': needsQuery.data?.length,
  }

  const term = search.trim().toLowerCase()
  const filtered =
    term === ''
      ? chats
      : chats.filter(({ customer }) =>
          [customer.displayName, customer.phone].some((value) =>
            value?.toLowerCase().includes(term)
          )
        )

  return (
    <div className='flex w-full flex-col gap-2 sm:w-56 desktop:w-72'>
      <ChatListHeader
        searchState={{ search, setSearch }}
        viewState={{ view, setView }}
        counts={counts}
      />

      <ScrollArea className='-mx-3 h-full overflow-scroll p-3'>
        {activeQuery.isLoading ? (
          <ChatListSkeleton />
        ) : activeQuery.isError ? (
          <ChatListError onRetry={() => void activeQuery.refetch()} />
        ) : filtered.length === 0 ? (
          <ChatListEmpty
            view={view}
            search={search.trim()}
            onClearSearch={() => setSearch('')}
          />
        ) : (
          <div className='flex flex-col gap-1'>
            {filtered.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                waiting={view !== 'inbox'}
                now={now}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
