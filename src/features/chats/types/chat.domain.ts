import type {
  ChatListItem,
  ChatPreview,
  ChatMessageContent,
  ContactResponse,
  MessageSenderType,
  MessageType,
} from '@chat-crm/contracts'

export type {
  ChatClient,
  ChatListItem,
  ChatPreview,
  ChatStatus,
  ContactSource as ClientSource,
  ContactStatus as ClientStatus,
} from '@chat-crm/contracts'

/** Chat message as it travels over the socket (broadcast payload). */
export interface ChatMessage {
  id: string
  chatId?: string
  msg: {
    type: MessageType
    mediaUrl?: string
    content: ChatMessageContent
  }
  sender: {
    id: string
    type: MessageSenderType
  }
  timestamp: Date
}

export interface ChatAgent {
  id: string
  username: string
}

/** Vistas del panel de chats (asignación automática). */
export type ChatListView = 'inbox' | 'queue' | 'needs-response'

/**
 * Chat de la lista (`GET /chats/list`) más los extras locales de las vistas de
 * asignación (cola / sin respuesta).
 */
export interface Chat extends Omit<ChatListItem, 'preview'> {
  preview?: ChatPreview
  isDraft?: boolean
  /** Cola de sin asignar: momento del último mensaje (antigüedad). */
  waitingSince?: string
  /** Vista "sin respuesta": dueño actual (null si está en cola). */
  agent?: ChatAgent | null
  /** Marcado local: el chat está en la cola y se puede reclamar. */
  isUnassigned?: boolean
}

/** Cliente del chat: el contacto del API (contrato compartido). */
export type Client = ContactResponse

// SENTIMENT
export interface ChatSentiment {
  chatId?: string
  avgPos: number
  avgNeg: number
  avgNeu: number
  totalMessages: number
  dominant: 'POS' | 'NEG' | 'NEU'
}

export type SentimentData = ChatSentiment
