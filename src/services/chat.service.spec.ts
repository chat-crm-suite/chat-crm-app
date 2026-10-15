import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))

vi.mock('@/lib/http', () => ({
  client: () => ({ get, post }),
}))

import {
  assignMember,
  claimChat,
  getConversationSentiment,
  getNeedsResponseChats,
  getUnassignedChats,
} from './chat.service'

describe('chat.service conversation operations', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
  })

  it('assigns a member through POST /conversations/assign', async () => {
    post.mockResolvedValue({ data: { outcome: 'assigned' } })

    await assignMember('conversation-1', 'member-1')

    expect(post).toHaveBeenCalledWith('/assign', {
      conversationId: 'conversation-1',
      memberId: 'member-1',
    })
  })

  it('claims a conversation through POST /conversations/:id/claim', async () => {
    post.mockResolvedValue({ data: { outcome: 'assigned' } })

    await claimChat('conversation-1')

    expect(post).toHaveBeenCalledWith('/conversation-1/claim')
  })

  it('fetches the unassigned queue', async () => {
    get.mockResolvedValue({ data: [{ id: 'conversation-1' }] })

    await expect(getUnassignedChats()).resolves.toEqual([
      { id: 'conversation-1' },
    ])
    expect(get).toHaveBeenCalledWith('/unassigned')
  })

  it('fetches needs-response conversations with the minutes window', async () => {
    get.mockResolvedValue({ data: [] })

    await getNeedsResponseChats(30)

    expect(get).toHaveBeenCalledWith('/needs-response', {
      params: { minutes: 30 },
    })
  })

  it('fetches the tone of a conversation through GET /conversations/:id/sentiment', async () => {
    const sentiment = {
      avgPos: 0.52,
      avgNeu: 0.31,
      avgNeg: 0.17,
      totalMessages: 48,
      dominant: 'POS' as const,
    }
    get.mockResolvedValue({ data: sentiment })

    await expect(getConversationSentiment('conversation-1')).resolves.toEqual(
      sentiment
    )
    expect(get).toHaveBeenCalledWith('/conversation-1/sentiment')
  })

  it('rejects a tone payload that drifts from the shared contract in dev', async () => {
    get.mockResolvedValue({ data: { avgPos: 0.52, dominant: 'POS' } })

    await expect(getConversationSentiment('conversation-1')).rejects.toThrow()
  })
})
