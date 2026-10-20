import { useEffect } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useMemberRole } from '@/hooks/use-member-role'
import { useChats } from '../contexts/chats.context'
import { useChatLists } from './chat-list'

/**
 * Deep link `/chats?conversation=<id>` (analytics floor views, Mi trabajo):
 * selects the conversation once it shows up in one of the list tabs, then
 * drops the param so a later manual selection is not overridden. Shares the
 * list caches with `ChatList` (same query keys).
 */
export function OpenConversationFromSearch() {
  const { conversation } = useSearch({ from: '/_authenticated/chats/' })
  const navigate = useNavigate()
  const { setChatSelected, setMobile } = useChats()
  const { canSupervise } = useMemberRole()
  const { mine, queue, needs, all } = useChatLists(canSupervise)

  useEffect(() => {
    if (!conversation) return
    const sources = canSupervise
      ? [mine, queue, needs, all]
      : [mine, queue, needs]
    const chat = sources
      .map((query) => query.data?.find((item) => item.id === conversation))
      .find(Boolean)
    const settled = sources.every((query) => !query.isPending)

    if (chat) {
      setChatSelected(chat)
      setMobile(true)
    }
    if (chat || settled) {
      void navigate({ to: '/chats', search: {}, replace: true })
    }
  }, [
    conversation,
    canSupervise,
    mine,
    queue,
    needs,
    all,
    navigate,
    setChatSelected,
    setMobile,
  ])

  return null
}
