import { describe, expect, it } from 'vitest'
import type { ChatMessage } from '../types/chat.domain'
import {
  applyAttachmentPatch,
  applyStatusPatch,
  markMessagePending,
  upsertMessage,
} from './thread-state'

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'm-1',
    conversationId: 'c-1',
    timestamp: new Date('2026-10-06T09:00:00'),
    status: 'delivered',
    sender: { id: 'customer-1', type: 'customer' },
    msg: { type: 'text', mediaUrl: null, content: { body: 'Hola' } },
    ...overrides,
  }
}

describe('upsertMessage', () => {
  it('reconciles the optimistic row with the saved broadcast by clientMessageId', () => {
    const optimistic = makeMessage({
      id: 'client-1',
      clientMessageId: 'client-1',
      status: 'pending',
      sender: { id: 'member-1', type: 'member' },
      timestamp: new Date('2026-10-06T09:00:00'),
    })
    const saved = makeMessage({
      id: 'server-1',
      clientMessageId: 'client-1',
      status: 'pending',
      sender: { id: 'member-1', type: 'member' },
      timestamp: new Date('2026-10-06T09:00:01'),
    })

    const thread = upsertMessage([optimistic], saved)

    expect(thread).toHaveLength(1)
    expect(thread[0].id).toBe('server-1')
    expect(thread[0].clientMessageId).toBe('client-1')
  })

  it('keeps one row when the same broadcast arrives twice', () => {
    const broadcast = makeMessage({
      id: 'server-1',
      clientMessageId: 'client-1',
      timestamp: new Date('2026-10-06T09:00:00'),
    })

    const thread = upsertMessage(upsertMessage([], broadcast), broadcast)

    expect(thread).toHaveLength(1)
    expect(thread[0].id).toBe('server-1')
  })

  it('orders the thread chronologically after inserting an older message', () => {
    const later = makeMessage({
      id: 'm-2',
      timestamp: new Date('2026-10-06T10:00:00'),
    })
    const earlier = makeMessage({
      id: 'm-1',
      timestamp: new Date('2026-10-06T09:00:00'),
    })

    const thread = upsertMessage([later], earlier)

    expect(thread.map((message) => message.id)).toEqual(['m-1', 'm-2'])
  })

  it('does not regress a reconciled row when a stale pending broadcast arrives late', () => {
    const sent = makeMessage({
      id: 'server-1',
      clientMessageId: 'client-1',
      status: 'sent',
      timestamp: new Date('2026-10-06T09:00:01'),
    })
    const staleBroadcast = makeMessage({
      id: 'server-1',
      clientMessageId: 'client-1',
      status: 'pending',
      timestamp: new Date('2026-10-06T09:00:01'),
    })

    const thread = upsertMessage([sent], staleBroadcast)

    expect(thread).toHaveLength(1)
    expect(thread[0].status).toBe('sent')
  })
})

describe('applyStatusPatch', () => {
  it('advances the ticks pending -> sent -> delivered -> read', () => {
    const pending = makeMessage({
      id: 'server-1',
      clientMessageId: 'client-1',
      status: 'pending',
      sender: { id: 'member-1', type: 'member' },
    })
    const patch = (status: 'sent' | 'delivered' | 'read') => ({
      id: 'server-1',
      conversationId: 'c-1',
      clientMessageId: 'client-1',
      status,
      at: new Date('2026-10-06T09:00:02'),
    })

    const thread = applyStatusPatch(
      applyStatusPatch(
        applyStatusPatch([pending], patch('sent')),
        patch('delivered')
      ),
      patch('read')
    )

    expect(thread[0].status).toBe('read')
  })

  it('matches the optimistic row by clientMessageId before the broadcast lands', () => {
    const optimistic = makeMessage({
      id: 'client-1',
      clientMessageId: 'client-1',
      status: 'pending',
      sender: { id: 'member-1', type: 'member' },
    })

    const thread = applyStatusPatch([optimistic], {
      id: 'server-1',
      conversationId: 'c-1',
      clientMessageId: 'client-1',
      status: 'sent',
      at: new Date('2026-10-06T09:00:02'),
    })

    expect(thread).toHaveLength(1)
    expect(thread[0].status).toBe('sent')
  })

  it('keeps a failed row failed when a stale sent patch arrives', () => {
    const failed = makeMessage({
      id: 'server-1',
      clientMessageId: 'client-1',
      status: 'failed',
      sender: { id: 'member-1', type: 'member' },
    })

    const thread = applyStatusPatch([failed], {
      id: 'server-1',
      conversationId: 'c-1',
      clientMessageId: 'client-1',
      status: 'sent',
      at: new Date('2026-10-06T09:00:02'),
    })

    expect(thread[0].status).toBe('failed')
  })

  it('ignores a patch for a message that is not in the thread', () => {
    const messages = [makeMessage({ id: 'server-1' })]

    const thread = applyStatusPatch(messages, {
      id: 'server-9',
      conversationId: 'c-1',
      clientMessageId: 'client-9',
      status: 'read',
      at: new Date('2026-10-06T09:00:02'),
    })

    expect(thread).toBe(messages)
  })
})

describe('markMessagePending', () => {
  it('resets a failed row to pending so the retry can advance again', () => {
    const failed = makeMessage({
      id: 'server-1',
      clientMessageId: 'client-1',
      status: 'failed',
      sender: { id: 'member-1', type: 'member' },
    })

    const thread = markMessagePending([failed], {
      id: 'server-1',
      clientMessageId: 'client-1',
    })

    expect(thread[0].status).toBe('pending')
  })
})

describe('applyAttachmentPatch', () => {
  it('publishes the stored file when the async enrichment turns ready', () => {
    const pending = makeMessage({
      id: 'server-1',
      msg: {
        type: 'image',
        mediaUrl: null,
        attachmentStatus: 'pending',
        content: { caption: 'foto' },
      },
    })

    const thread = applyAttachmentPatch([pending], {
      id: 'server-1',
      conversationId: 'c-1',
      attachmentId: 'att-1',
      status: 'ready',
      url: '/uploads/photo.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1234,
      at: new Date('2026-10-06T09:00:02'),
    })

    expect(thread[0].msg.mediaUrl).toBe('/uploads/photo.jpg')
    expect(thread[0].msg.attachmentStatus).toBe('ready')
  })

  it('marks the attachment failed while the row stays in the thread', () => {
    const pending = makeMessage({
      id: 'server-1',
      msg: {
        type: 'image',
        mediaUrl: null,
        attachmentStatus: 'pending',
        content: { caption: 'foto' },
      },
    })

    const thread = applyAttachmentPatch([pending], {
      id: 'server-1',
      conversationId: 'c-1',
      attachmentId: 'att-1',
      status: 'failed',
      url: null,
      at: new Date('2026-10-06T09:00:02'),
    })

    expect(thread).toHaveLength(1)
    expect(thread[0].msg.attachmentStatus).toBe('failed')
    expect(thread[0].msg.mediaUrl).toBeNull()
  })

  it('ignores a patch for a message that is not in the thread', () => {
    const messages = [makeMessage({ id: 'server-1' })]

    const thread = applyAttachmentPatch(messages, {
      id: 'server-9',
      conversationId: 'c-1',
      attachmentId: 'att-9',
      status: 'ready',
      url: '/uploads/other.jpg',
      at: new Date('2026-10-06T09:00:02'),
    })

    expect(thread).toBe(messages)
  })
})
