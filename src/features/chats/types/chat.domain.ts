import type {
  ConversationCustomer,
  ConversationListItem,
  ConversationMessage,
  ConversationPriority,
  ConversationSentiment,
} from '@chat-crm/contracts'

export type {
  ConversationCustomer as ChatCustomer,
  ConversationPriority,
  ConversationStatus,
} from '@chat-crm/contracts'

/**
 * What only this client knows about a row it is sending: the local preview
 * of the file (`blob:` URL) and the upload progress. Never sent by the API.
 */
export interface LocalSendState {
  previewUrl?: string
  /** Upload progress in [0, 1] while the file goes to the API. */
  progress?: number
}

/**
 * Conversation message as REST and the socket deliver it (shared contract),
 * plus the local send state of rows this client is sending.
 */
export type ChatMessage = ConversationMessage & { local?: LocalSendState }

/** Miembro de la empresa dueño de una conversación. */
export interface ChatMember {
  id: string
  username: string | null
}

/** Vistas del panel de chats (asignación automática). */
export type ChatListView = 'inbox' | 'queue' | 'needs-response'

/** Último mensaje que muestra la lista (payload REST + actualizaciones en vivo). */
export type ChatPreviewData = ConversationListItem['preview']

/**
 * Conversación de la lista (`GET /conversations/list`) más los extras locales
 * de las vistas de asignación (cola / sin respuesta).
 */
export interface Chat extends Omit<ConversationListItem, 'preview'> {
  preview?: ChatPreviewData
  isDraft?: boolean
  /** Cola de sin asignar: momento del último mensaje (antigüedad). */
  waitingSince?: string | Date | null
  /** Vista "sin respuesta": dueño actual (null si está en cola). */
  member?: ChatMember | null
  /** Marcado local: la conversación está en la cola y se puede reclamar. */
  isUnassigned?: boolean
  /**
   * Case priority when the API emits it; today no list endpoint does, so the
   * rail hides the row instead of inventing a value.
   */
  priority?: ConversationPriority | null
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
