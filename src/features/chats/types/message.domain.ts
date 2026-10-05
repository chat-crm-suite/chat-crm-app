/**
 * Message types come from the shared contracts (single source of truth).
 * Re-exported with the historical frontend names so call sites keep working.
 */
export type {
  MessageContent as WhatsAppMessageContent,
  MessageDirection,
  MessageSenderType as SenderType,
  MessageStatus,
  MessageType,
  WhatsAppDocumentContent,
  WhatsAppMediaContent,
  WhatsAppTextContent,
} from '@chat-crm/contracts'
