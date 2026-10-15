import { describe, expect, it } from 'vitest'
import { isConversationUnassigned } from './conversation-assignment'

describe('isConversationUnassigned', () => {
  it('treats the queue marker as unassigned', () => {
    expect(isConversationUnassigned({ isUnassigned: true })).toBe(true)
  })

  it('treats a null member (needs-response, no owner) as unassigned', () => {
    expect(isConversationUnassigned({ member: null })).toBe(true)
  })

  it('keeps an omitted member (inbox payload, mine) assigned', () => {
    expect(isConversationUnassigned({ isUnassigned: false })).toBe(false)
  })

  it('keeps a conversation with an owner assigned', () => {
    expect(
      isConversationUnassigned({
        isUnassigned: false,
        member: { id: 'member-1', username: 'aron' },
      })
    ).toBe(false)
  })
})
