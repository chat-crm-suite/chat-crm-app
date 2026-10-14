import type { MediaRef, MessageView } from '@chat-crm/contracts'
import type { ChatMessage } from '../types/chat.domain'

/** A file the API already serves. */
export function readyMedia(overrides: Partial<MediaRef> = {}): MediaRef {
  return {
    attachmentId: 'att-1',
    url: '/attachments/att-1',
    status: 'ready',
    mimeType: 'image/jpeg',
    sizeBytes: 2048,
    durationMs: null,
    width: 640,
    height: 480,
    ...overrides,
  }
}

/** A thread row; text from the customer unless overridden. */
export function makeMessage(
  overrides: Partial<ChatMessage> = {}
): ChatMessage {
  return {
    id: 'm-1',
    conversationId: 'c-1',
    clientMessageId: null,
    timestamp: new Date('2026-10-06T09:00:00'),
    status: 'delivered',
    sender: { id: 'customer-1', type: 'customer' },
    msg: { type: 'text', text: 'Hola' },
    ...overrides,
  }
}

/** A row carrying `view` (any kind). */
export function messageWith(
  view: MessageView,
  overrides: Partial<ChatMessage> = {}
): ChatMessage {
  return makeMessage({ msg: view, ...overrides })
}
