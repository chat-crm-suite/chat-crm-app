import { ConversationSocketEvent } from '@chat-crm/contracts'

/**
 * Socket event names (values from the shared contracts, historical lowercase
 * keys kept for call sites).
 */
export const ChatSocketEvents = {
  join: ConversationSocketEvent.Join,
  joined: ConversationSocketEvent.Joined,
  broadcast: ConversationSocketEvent.BroadcastMessage,
  messageStatus: ConversationSocketEvent.MessageStatus,
  messageAttachment: ConversationSocketEvent.MessageAttachment,
  error: ConversationSocketEvent.ErrorMessage,
  sendMessage: ConversationSocketEvent.SendMessage,
  // TODO(backend): no `conversation:message:received` handler exists yet; the
  // event stays mapped for parity but is never emitted or subscribed to.
  received: ConversationSocketEvent.ReceivedMessage,
  sentimentIndicator: ConversationSocketEvent.UpdateSentimentIndicator,
  assigned: ConversationSocketEvent.ConversationAssigned,
  unassigned: ConversationSocketEvent.ConversationUnassigned,
  notification: ConversationSocketEvent.NewNotification,
} as const

export type ChatSocketEvents =
  (typeof ChatSocketEvents)[keyof typeof ChatSocketEvents]
