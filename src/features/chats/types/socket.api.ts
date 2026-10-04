import { ChatSocketEvent } from '@chat-crm/contracts'

/**
 * Socket event names (values from the shared contracts, historical lowercase
 * keys kept for call sites).
 */
export const ChatSocketEvents = {
  join: ChatSocketEvent.Join,
  broadcast: ChatSocketEvent.BroadcastMessage,
  error: ChatSocketEvent.ErrorMessage,
  sendMessage: ChatSocketEvent.SendMessage,
  sentimentIndicator: ChatSocketEvent.UpdateSentimentIndicator,
  assigned: ChatSocketEvent.ChatAssigned,
  unassigned: ChatSocketEvent.ChatUnassigned,
} as const

export type ChatSocketEvents =
  (typeof ChatSocketEvents)[keyof typeof ChatSocketEvents]
