import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FIXTURE_CONVERSATIONS } from '@/features/chats/__fixtures__/conversations'
import {
  assignMember,
  claimChat,
  getConversationSentiment,
  getNeedsResponseChats,
  getUnassignedChats,
  listConversations,
  resolveConversation,
  transferConversation,
} from './chat.service'

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))

vi.mock('@/lib/http', () => ({
  client: () => ({ get, post }),
}))

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

  it('fetches the unassigned queue and completes legacy rows', async () => {
    get.mockResolvedValue({
      data: [{ id: 'conversation-1', channelType: 'whatsapp', member: null }],
    })

    const [chat] = await getUnassignedChats()
    expect(chat).toMatchObject({
      id: 'conversation-1',
      assignee: null,
      status: 'open',
      channel: { type: 'whatsapp', name: 'WhatsApp' },
    })
    expect(get).toHaveBeenCalledWith('/unassigned')
  })

  it('lists conversations by scope through GET /conversations', async () => {
    get.mockResolvedValue({
      data: JSON.parse(JSON.stringify(FIXTURE_CONVERSATIONS)),
    })

    const chats = await listConversations({ scope: 'all' })

    expect(get).toHaveBeenCalledWith('', { params: { scope: 'all' } })
    expect(chats[0].createdAt).toBeInstanceOf(Date)
  })

  it('resolves and transfers through the lifecycle endpoints', async () => {
    const result = { id: 'c-1', status: 'closed', assignee: null, case: null }
    post.mockResolvedValue({ data: result })

    await expect(resolveConversation('c-1', { note: 'ok' })).resolves.toEqual(
      result
    )
    expect(post).toHaveBeenCalledWith('/c-1/resolve', { note: 'ok' })

    await transferConversation('c-1', { memberId: 'm-2', note: 'VIP' })
    expect(post).toHaveBeenCalledWith('/c-1/transfer', {
      memberId: 'm-2',
      note: 'VIP',
    })
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
