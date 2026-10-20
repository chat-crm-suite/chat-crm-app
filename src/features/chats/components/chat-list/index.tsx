import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getNeedsResponseChats,
  getUnassignedChats,
  listConversations,
} from '@/services/chat.service'
import { useMemberRole } from '@/hooks/use-member-role'
import { useNow } from '../../hooks/use-now'
import { chatKeys } from '../../lib/query-keys'
import type { Chat, ChatListView } from '../../types/chat.domain'
import { ChatListHeader } from './chat-list-header'
import { ChatListItem } from './chat-list-item'
import {
  ChatListEmpty,
  ChatListError,
  ChatListSkeleton,
} from './chat-list-states'

const AGENT_VIEWS: readonly ChatListView[] = ['mine', 'queue', 'needs']
const SUPERVISOR_VIEWS: readonly ChatListView[] = [
  'mine',
  'queue',
  'needs',
  'all',
]

/** Tabs of the list, one query each (shared keys with the deep link). */
export function useChatLists(canSupervise: boolean) {
  const mine = useQuery({
    queryKey: chatKeys.list('mine'),
    queryFn: () => listConversations({ scope: 'mine' }),
    placeholderData: (prev) => prev,
  })
  const queue = useQuery({
    queryKey: chatKeys.list('queue'),
    queryFn: getUnassignedChats,
    placeholderData: (prev) => prev,
  })
  const needs = useQuery({
    queryKey: chatKeys.list('needs'),
    queryFn: () => getNeedsResponseChats(),
    placeholderData: (prev) => prev,
  })
  // `scope=all` answers 403 to agents: never ask for it without the role.
  const all = useQuery({
    queryKey: chatKeys.list('all'),
    queryFn: () => listConversations({ scope: 'all' }),
    enabled: canSupervise,
    placeholderData: (prev) => prev,
  })

  return { mine, queue, needs, all }
}

/**
 * List pane of the inbox surface (fixed width from `sm`): header aligned
 * with the conversation header, search, tabs and the rows. Each tab is its
 * own query, so one failing endpoint never empties the others.
 */
export const ChatList = () => {
  const [search, setSearch] = useState('')
  const [view, setView] = useState<ChatListView>('mine')
  const { canSupervise } = useMemberRole()
  const now = useNow()
  const queries = useChatLists(canSupervise)

  const views = canSupervise ? SUPERVISOR_VIEWS : AGENT_VIEWS
  const activeView: ChatListView = views.includes(view) ? view : 'mine'
  const activeQuery = queries[activeView]
  const chats: Chat[] = activeQuery.data ?? []

  const counts: Partial<Record<ChatListView, number | undefined>> = {
    mine: queries.mine.data?.length,
    queue: queries.queue.data?.length,
    needs: queries.needs.data?.length,
    all: canSupervise ? queries.all.data?.length : undefined,
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
    <div className='flex min-h-0 w-full flex-col sm:w-72 sm:flex-none lg:w-80'>
      <ChatListHeader
        searchState={{ search, setSearch }}
        viewState={{ view: activeView, setView }}
        views={views}
        counts={counts}
      />

      <div className='min-h-0 flex-1 overflow-y-auto p-2'>
        {activeQuery.isLoading ? (
          <ChatListSkeleton />
        ) : activeQuery.isError ? (
          <ChatListError onRetry={() => void activeQuery.refetch()} />
        ) : filtered.length === 0 ? (
          <ChatListEmpty
            view={activeView}
            search={search.trim()}
            onClearSearch={() => setSearch('')}
          />
        ) : (
          <div className='flex flex-col gap-0.5'>
            {filtered.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                waiting={activeView === 'queue' || activeView === 'needs'}
                showAssignee={activeView === 'all'}
                now={now}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
