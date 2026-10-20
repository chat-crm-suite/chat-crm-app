import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  applyChatPatch,
  patchChatLists,
  type ChatPatch,
} from '../lib/chat-cache'
import type { Chat, ChatSentiment } from '../types/chat.domain'
import { ChatsContext } from './chats.context'

/** Neutral tone until the open conversation's sentiment loads. */
const NEUTRAL_SENTIMENT: ChatSentiment = {
  avgPos: 0,
  avgNeg: 0,
  avgNeu: 0,
  totalMessages: 0,
  dominant: 'NEU',
}

/** UI state shared by the chat list, the open chat and the new-chat dialog. */
export function ChatsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [mobile, setMobile] = useState(false)
  const [searchClientDialog, setSearchClientDialog] = useState(false)
  const [chatSelected, setChatSelected] = useState<Chat | null>(null)
  const [sentimentData, setSentimentData] = useState<ChatSentiment | undefined>(
    NEUTRAL_SENTIMENT
  )

  const updateChat = useCallback(
    (conversationId: string, patch: ChatPatch) => {
      patchChatLists(queryClient, conversationId, patch)
      setChatSelected((current) =>
        current?.id === conversationId
          ? applyChatPatch(current, patch)
          : current
      )
    },
    [queryClient]
  )

  // Stable value: consumers re-render only when something they read changed.
  const value = useMemo(
    () => ({
      chatSelected,
      setChatSelected,
      updateChat,
      sentimentData,
      setSentimentData,
      searchClientDialog,
      setSearchClientDialog,
      mobile,
      setMobile,
    }),
    [chatSelected, updateChat, sentimentData, searchClientDialog, mobile]
  )

  return <ChatsContext value={value}>{children}</ChatsContext>
}
