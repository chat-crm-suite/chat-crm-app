import {
  ChannelTypeSchema,
  ConversationListItemSchema,
  ConversationStatusSchema,
} from '@chat-crm/contracts'
import { CHANNEL_LABEL } from '../copy'
import type { Chat } from '../types/chat.domain'

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {}
}

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value ? value : null

const asDate = (value: unknown): Date | null => {
  if (value instanceof Date) return value
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Turns a row of the queue endpoints (`GET /conversations/unassigned`,
 * `/needs-response`) into a list item.
 *
 * `GET /conversations` answers the full `ConversationListItemSchema`; the two
 * queue endpoints predate it and may still answer the older, narrower row
 * (`member`, no `channel`/`assignee`). A full row goes through the contract
 * untouched; a narrow one is completed with neutral values so the list never
 * crashes while both shapes coexist. `waitingSince` is kept when present.
 */
export function toChat(raw: unknown): Chat {
  const parsed = ConversationListItemSchema.safeParse(raw)
  const record = asRecord(raw)
  const waitingSince = asDate(record.waitingSince)

  if (parsed.success) {
    return waitingSince ? { ...parsed.data, waitingSince } : parsed.data
  }

  const channelType = ChannelTypeSchema.catch('whatsapp').parse(
    record.channelType
  )
  const channel = asRecord(record.channel)
  const member = record.member === null ? null : asRecord(record.member)
  const preview = asRecord(record.preview)
  const customer = asRecord(record.customer)
  const memberId = member ? asString(member.id) : null

  return {
    id: asString(record.id) ?? '',
    preview: {
      content: asString(preview.content),
      datetime: asDate(preview.datetime),
    },
    customer: {
      id: asString(customer.id) ?? '',
      displayName: asString(customer.displayName),
      phone: asString(customer.phone),
    },
    channelType,
    channel: {
      id: asString(channel.id) ?? '',
      type: channelType,
      name: asString(channel.name) ?? CHANNEL_LABEL[channelType],
    },
    status: ConversationStatusSchema.catch('open').parse(record.status),
    priority: null,
    assignee:
      member && memberId
        ? {
            memberId,
            userId: asString(member.userId) ?? '',
            name: asString(member.name) ?? asString(member.username) ?? '',
          }
        : null,
    transfer: null,
    lastInboundAt: asDate(record.lastInboundAt),
    windowExpiresAt: asDate(record.windowExpiresAt),
    unread: typeof record.unread === 'number' ? record.unread : 0,
    createdAt: asDate(record.createdAt) ?? new Date(0),
    ...(waitingSince ? { waitingSince } : {}),
  }
}
