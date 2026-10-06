import type {
  AttachmentStatus,
  ConversationCustomer,
  ConversationListItem,
  ConversationSentiment,
  MessageContent,
  MessageSenderType,
  MessageStatus,
  MessageType,
} from '@chat-crm/contracts'

export type {
  ConversationCustomer as ChatCustomer,
  ConversationPriority,
  ConversationStatus,
} from '@chat-crm/contracts'

/** Conversation message as it travels over REST/socket (v2 broadcast payload). */
export interface ChatMessage {
  id: string
  conversationId: string
  /**
   * Front-generated send id: present on optimistic rows and on outbound rows
   * saved by the API, so the thread reconciles without duplicating.
   */
  clientMessageId?: string | null
  timestamp: Date
  status: MessageStatus
  sender: {
    id: string
    type: MessageSenderType
  }
  msg: {
    type: MessageType
    mediaUrl?: string | null
    /**
     * Attachment lifecycle as sent by the API (`pending → ready | failed`).
     * Optional: payloads without it fall back to `mediaUrl` presence.
     */
    attachmentStatus?: AttachmentStatus | null
    content: MessageContent
  }
}

/** Miembro de la empresa dueño de una conversación. */
export interface ChatMember {
  id: string
  username: string | null
}

/** Vistas del panel de chats (asignación automática). */
export type ChatListView = 'inbox' | 'queue' | 'needs-response'

/**
 * Conversación de la lista (`GET /conversations/list`) más los extras locales
 * de las vistas de asignación (cola / sin respuesta).
 */
export interface Chat extends Omit<ConversationListItem, 'preview'> {
  preview?: ConversationListItem['preview']
  isDraft?: boolean
  /** Cola de sin asignar: momento del último mensaje (antigüedad). */
  waitingSince?: string | Date | null
  /** Vista "sin respuesta": dueño actual (null si está en cola). */
  member?: ChatMember | null
  /** Marcado local: la conversación está en la cola y se puede reclamar. */
  isUnassigned?: boolean
}

/** Cliente de la conversación: el contacto v2 (contrato compartido). */
export type Client = ConversationCustomer

// SENTIMENT
/**
 * Customer tone as returned by the API, aliased to the shared contract so the
 * service parse and every consumer cannot drift from the payload shape.
 */
export type ChatSentiment = ConversationSentiment

export type SentimentData = ChatSentiment
