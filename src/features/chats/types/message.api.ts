/**
 * Message types come from the shared contracts (single source of truth).
 * `SendMessageRequest` mirrors the `conversation:message:send` payload.
 */
export type {
  MessageDirection,
  MessageSenderType as Sender,
  MessageSenderType as SenderType,
  MessageStatus,
  MessageType,
  SendConversationMessageInput,
  SendConversationMessageInput as SendMessageRequest,
} from '@chat-crm/contracts'

/** Text body of an outgoing message. */
export interface TextMessage {
  body: string
}
