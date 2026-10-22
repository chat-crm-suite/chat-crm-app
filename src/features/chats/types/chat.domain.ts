import type {
  ConversationCustomer,
  ConversationListItem,
  ConversationMessage,
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

/**
 * Tabs of the chat list:
 * - `mine`: assigned to me (`GET /conversations?scope=mine`);
 * - `queue`: unassigned, anyone can take them;
 * - `needs`: the customer wrote last and is waiting for a reply;
 * - `all`: every conversation of the company (admin/supervisor only).
 */
export type ChatListView = 'mine' | 'queue' | 'needs' | 'all'

/** Last message shown by the list (REST payload + live updates). */
export type ChatPreviewData = ConversationListItem['preview']

/**
 * A conversation of the list: the shared list item plus the waiting stamp of
 * the queue views (age of the oldest unanswered message).
 */
export interface Chat extends Omit<ConversationListItem, 'preview'> {
  preview?: ChatPreviewData
  /** Queue / needs-response views: since when the customer is waiting. */
  waitingSince?: string | Date | null
}

/** Conversation customer: the v2 contact (shared contract). */
export type Client = ConversationCustomer

/**
 * Customer tone as returned by the API, aliased to the shared contract so the
 * service parse and every consumer cannot drift from the payload shape.
 */
export type ChatSentiment = ConversationSentiment

export type SentimentData = ChatSentiment
