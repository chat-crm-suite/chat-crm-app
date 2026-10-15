import { createContext, useContext } from 'react'
import type { Chat, ChatSentiment } from '../types/chat.domain'

export interface ChatsContextValue {
  chatSelected: Chat | null
  setChatSelected: (chat: Chat | null) => void
  sentimentData?: ChatSentiment
  setSentimentData: (data?: ChatSentiment) => void
  mobile: boolean
  setMobile: (mobile: boolean) => void
  searchClientDialog: boolean
  setSearchClientDialog: (open: boolean) => void
}

export const ChatsContext = createContext<ChatsContextValue | undefined>(undefined)

export function useChats(): ChatsContextValue {
  const context = useContext(ChatsContext)

  if (!context) throw new Error('useChats must be used within ChatsProvider')

  return context
}
