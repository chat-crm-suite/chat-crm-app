import { useMemo, useState, type ReactNode } from 'react'
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
  const [mobile, setMobile] = useState(false)
  const [searchClientDialog, setSearchClientDialog] = useState(false)
  const [chatSelected, setChatSelected] = useState<Chat | null>(null)
  const [sentimentData, setSentimentData] = useState<ChatSentiment | undefined>(
    NEUTRAL_SENTIMENT
  )

  // Stable value: consumers re-render only when something they read changed.
  const value = useMemo(
    () => ({
      chatSelected,
      setChatSelected,
      sentimentData,
      setSentimentData,
      searchClientDialog,
      setSearchClientDialog,
      mobile,
      setMobile,
    }),
    [chatSelected, sentimentData, searchClientDialog, mobile]
  )

  return <ChatsContext value={value}>{children}</ChatsContext>
}
