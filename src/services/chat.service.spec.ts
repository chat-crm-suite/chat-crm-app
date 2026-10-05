import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))

vi.mock('@/lib/http', () => ({
  client: () => ({ get, post }),
}))

import {
  assignMember,
  claimChat,
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
})
