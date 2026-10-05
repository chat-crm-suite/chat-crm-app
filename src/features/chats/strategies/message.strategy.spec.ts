import { describe, expect, it } from 'vitest'

import type { ChatMessage } from '../types/chat.domain'
import { getMessageStrategy } from './message.strategy'

const baseMsg = {
  id: 'msg-1',
  conversationId: 'conv-1',
  timestamp: new Date(),
  status: 'delivered',
  sender: { id: 'member-1', type: 'member' },
} as ChatMessage

describe('getMessageStrategy', () => {
  it('keeps the attachment url for images', () => {
    const { url } = getMessageStrategy('image').getRenderData({
      ...baseMsg.msg,
      type: 'image',
      mediaUrl: '/uploads/photo.jpg',
      content: {},
    } as ChatMessage['msg'])

    expect(url).toBe('/uploads/photo.jpg')
  })

  it('never stringifies a missing url (no ".../null" requests)', () => {
    const { url } = getMessageStrategy('image').getRenderData({
      type: 'image',
      mediaUrl: null,
      content: {},
    } as ChatMessage['msg'])

    expect(url).toBeUndefined()
  })

  it('falls back instead of throwing for types without strategy', () => {
    const strategy = getMessageStrategy('audio')
    const msg = { type: 'audio', content: {} } as ChatMessage['msg']

    expect(() => strategy.getRenderData(msg)).not.toThrow()
    expect(strategy.getRenderData(msg).text).toContain('no soportado')
    expect(strategy.getContent({} as never)).toContain('no soportado')
  })
})
