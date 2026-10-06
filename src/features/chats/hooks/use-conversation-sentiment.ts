import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSocket } from '@/context/socket-provider'
import { getConversationSentiment } from '@/services/chat.service'
import { useChats } from '../contexts/chats.provider'
import { ChatSocketEvents as Events } from '../types/socket.api'

/**
 * The live payload carries the per-analysis probabilities (`pos/neu/neg`), not
 * the aggregate the UI needs, so a burst of analyses collapses into one refetch
 * of the conversation GET (single source of truth).
 */
const REFETCH_DEBOUNCE_MS = 500

/**
 * Customer tone of the open conversation: REST fetch plus sync into the chats
 * context, so every tone placement reads from one source. Live
 * `conversation:sentiment:update` events trigger a debounced refetch.
 */
export function useConversationSentiment(conversationId: string | undefined) {
  const { socket } = useSocket()
  const queryClient = useQueryClient()
  const { setSentimentData } = useChats()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const query = useQuery({
    queryKey: ['chat', conversationId, 'sentiment'],
    queryFn: () => getConversationSentiment(conversationId as string),
    enabled: !!conversationId,
  })

  useEffect(() => {
    setSentimentData(query.data)
  }, [query.data, setSentimentData])

  useEffect(() => {
    if (!socket || !conversationId) return

    const scheduleRefetch = () => {
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        void queryClient.invalidateQueries({
          queryKey: ['chat', conversationId, 'sentiment'],
        })
      }, REFETCH_DEBOUNCE_MS)
    }

    socket.on(Events.sentimentIndicator, scheduleRefetch)

    return () => {
      socket.off(Events.sentimentIndicator, scheduleRefetch)
      clearTimeout(debounceRef.current)
    }
  }, [socket, conversationId, queryClient])
}
