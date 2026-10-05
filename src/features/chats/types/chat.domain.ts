import type {
  ConversationCustomer,
  ConversationListItem,
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
  timestamp: Date
  status: MessageStatus
  sender: {
    id: string
    type: MessageSenderType
  }
  msg: {
    type: MessageType
    mediaUrl?: string | null
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
export interface ChatSentiment {
  conversationId?: string
  avgPos: number
  avgNeg: number
  avgNeu: number
  totalMessages: number
  dominant: 'POS' | 'NEG' | 'NEU'
}

export type SentimentData = ChatSentiment
