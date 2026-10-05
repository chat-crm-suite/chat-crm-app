import { client } from '@/lib/http'
import type { ChatMessage } from '../types/chat.domain'

const conversations = client('/conversations')

export const getMessagesByConversationId = async (
  conversationId: string
): Promise<ChatMessage[]> => {
  const response = await conversations.get<ChatMessage[]>(
    `/${conversationId}/messages`
  )
  return response?.data ?? []
}
