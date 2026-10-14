import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { getChatList, getUnassignedChats } from '@/services/chat.service'
import { useChats } from '../contexts/chats.context'

/**
 * Deep link `/chats?conversation=<id>` (used by the analytics floor views):
 * selects the conversation once it shows up in the inbox or the unassigned
 * queue, then drops the param so a later manual selection is not overridden.
 * Shares the list caches with `ChatList` (same query keys).
 */
export function OpenConversationFromSearch() {
  const { conversation } = useSearch({ from: '/_authenticated/chats/' })
  const navigate = useNavigate()
  const { setChatSelected, setMobile } = useChats()

  const inbox = useQuery({ queryKey: ['chat', 'list'], queryFn: getChatList })
  const queue = useQuery({
    queryKey: ['chat', 'unassigned'],
    queryFn: getUnassignedChats,
  })

  useEffect(() => {
    if (!conversation) return
    const fromInbox = inbox.data?.find((chat) => chat.id === conversation)
    const fromQueue = queue.data?.find((chat) => chat.id === conversation)
    const chat =
      fromInbox ??
      (fromQueue ? { ...fromQueue, isUnassigned: true } : undefined)
    const settled = !inbox.isPending && !queue.isPending

    if (chat) {
      setChatSelected(chat)
      setMobile(true)
    }
    if (chat || settled) {
      void navigate({ to: '/chats', search: {}, replace: true })
    }
  }, [
    conversation,
    inbox.data,
    inbox.isPending,
    queue.data,
    queue.isPending,
    navigate,
    setChatSelected,
    setMobile,
  ])

  return null
}
