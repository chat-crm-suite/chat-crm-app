/**
 * Message types come from the shared contracts (single source of truth).
 * `SendMessageRequest` mirrors the `chat:message:send` payload.
 */
export {
  MessageDirection,
  MessageType,
  MessageSenderType as SenderType,
  MessageStatus,
  type BroadcastMessage as Message,
  type SendChatMessageInput as SendMessageRequest,
  type SendChatMessageInput,
} from '@chat-crm/contracts'

/** Sender of a message (socket payload). */
export type { MessageSenderType as Sender } from '@chat-crm/contracts'

/** Text body of an outgoing message. */
export interface TextMessage {
  body: string
}
