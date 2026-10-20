import { ConversationListItemSchema } from '@chat-crm/contracts'
import type { Chat } from '../types/chat.domain'

/**
 * A list conversation for specs: parsed through the shared contract, so a
 * schema change breaks the builder (and every spec using it) loudly.
 */
export function makeChat(overrides: Partial<Chat> = {}): Chat {
  const base = ConversationListItemSchema.parse({
    id: 'c-1',
    preview: {
      content: 'Hola',
      datetime: new Date('2026-10-01T08:00:00'),
      type: 'text',
    },
    customer: {
      id: 'customer-1',
      displayName: 'Rosa Medina',
      phone: '+51987654321',
    },
    channelType: 'whatsapp',
    channel: {
      id: 'ch-1',
      type: 'whatsapp',
      name: 'WhatsApp Ventas',
      status: 'active',
      statusReason: null,
    },
    status: 'open',
    priority: null,
    assignee: { memberId: 'member-1', userId: 'user-1', name: 'Ana Torres' },
    transfer: null,
    lastInboundAt: null,
    windowExpiresAt: null,
    unread: 0,
    createdAt: new Date('2026-10-01T08:00:00'),
  })
  return { ...base, ...overrides }
}

export const ME = { memberId: 'member-1', userId: 'user-1', name: 'Ana Torres' }
export const OTHER = {
  memberId: 'member-2',
  userId: 'user-2',
  name: 'Luis Quispe',
}
