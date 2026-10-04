import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))

vi.mock('@/lib/http', () => ({
  client: () => ({ get, post }),
}))

import {
  assignedUser,
  claimChat,
  getNeedsResponseChats,
  getUnassignedChats,
} from './chat.service'

describe('chat.service assignment operations', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
  })

  it('assigns an agent through POST /chats/assign', async () => {
    post.mockResolvedValue({ data: { outcome: 'assigned' } })

    await assignedUser('chat-1', 'agent-1')

    expect(post).toHaveBeenCalledWith('/assign', {
      chatId: 'chat-1',
      agentId: 'agent-1',
    })
  })

  it('claims a chat through POST /chats/:id/claim', async () => {
    post.mockResolvedValue({ data: { outcome: 'assigned' } })

    await claimChat('chat-1')

    expect(post).toHaveBeenCalledWith('/chat-1/claim')
  })

  it('fetches the unassigned queue', async () => {
    get.mockResolvedValue({ data: [{ id: 'chat-1' }] })

    await expect(getUnassignedChats()).resolves.toEqual([{ id: 'chat-1' }])
    expect(get).toHaveBeenCalledWith('/unassigned')
  })

  it('fetches needs-response chats with the minutes window', async () => {
    get.mockResolvedValue({ data: [] })

    await getNeedsResponseChats(30)

    expect(get).toHaveBeenCalledWith('/needs-response', {
      params: { minutes: 30 },
    })
  })
})
