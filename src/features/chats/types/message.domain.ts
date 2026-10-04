/**
 * Message types come from the shared contracts (single source of truth).
 * Re-exported with the historical frontend names so call sites keep working.
 */
export {
  MessageDirection,
  MessageType,
  MessageSenderType as SenderType,
  MessageStatus,
  type ChatMessageContent as WhatsAppMessageContent,
  type WhatsAppDocumentContent,
  type WhatsAppMediaContent,
  type WhatsAppTextContent,
} from '@chat-crm/contracts'
