import {
  CompanyMemberResponseSchema,
  ConversationAssignmentEntrySchema,
  ConversationLifecycleResultSchema,
  ConversationListItemSchema,
  ConversationSentimentSchema,
  CurrentCaseSchema,
  SendTemplateResultSchema,
  StartConversationResultSchema,
  type CompanyMemberResponse,
  type ConversationAssignmentEntry,
  type ConversationLifecycleResult,
  type ConversationNoteInput,
  type ConversationSentiment,
  type CurrentCase,
  type ListConversationsQuery,
  type SendTemplateInput,
  type SendTemplateResult,
  type StartConversationInput,
  type StartConversationResult,
  type TransferConversationInput,
  type UpdateConversationPriorityInput,
} from '@chat-crm/contracts'
import { parseContract } from '@/lib/contract-parse'
import { withDevFixture } from '@/lib/dev-fixtures'
import { client } from '@/lib/http'
import { toChat } from '@/features/chats/lib/list-item'
import type { Chat } from '@/features/chats/types/chat.domain'

const conversations = client('/conversations')
const companyMembers = client('/company-members')

const fixtures = () => import('@/features/chats/__fixtures__/conversations')

/**
 * `GET /conversations`: my conversations (`scope=mine`) or every one of the
 * company (`scope=all`, admin/supervisor only). Closed and archived ones are
 * excluded unless `status` asks for them.
 */
export const listConversations = (
  query: Partial<ListConversationsQuery> = {}
): Promise<Chat[]> =>
  withDevFixture<Chat[]>(
    async () => {
      const { FIXTURE_LISTS } = await fixtures()
      return query.scope === 'all' ? FIXTURE_LISTS.all : FIXTURE_LISTS.mine
    },
    async () => {
      const { data } = await conversations.get('', { params: query })
      return parseContract(ConversationListItemSchema.array(), data ?? [])
    }
  )

/** Shared queue of unassigned conversations (anyone can take them). */
export const getUnassignedChats = (): Promise<Chat[]> =>
  withDevFixture<Chat[]>(
    async () => (await fixtures()).FIXTURE_LISTS.queue,
    async () => {
      const response = await conversations.get<unknown[]>('/unassigned')
      return (response?.data ?? []).map(toChat)
    }
  )

/** Conversations whose last message is the customer's, unanswered `minutes`. */
export const getNeedsResponseChats = (minutes = 15): Promise<Chat[]> =>
  withDevFixture<Chat[]>(
    async () => (await fixtures()).FIXTURE_LISTS.needs,
    async () => {
      const response = await conversations.get<unknown[]>('/needs-response', {
        params: { minutes },
      })
      return (response?.data ?? []).map(toChat)
    }
  )

/** Claims a free conversation for the signed-in member (409 if owned). */
export const claimChat = async (conversationId: string) => {
  const { data } = await conversations.post(`/${conversationId}/claim`)

  return data
}

/** Manual assignment of a free conversation by member id. */
export const assignMember = async (
  conversationId: string,
  memberId: string
) => {
  const { data } = await conversations.post('/assign', {
    conversationId,
    memberId,
  })

  return data
}

const lifecycle =
  (action: 'resolve' | 'pending' | 'reopen' | 'release') =>
  async (
    conversationId: string,
    input: ConversationNoteInput = {}
  ): Promise<ConversationLifecycleResult> => {
    const { data } = await conversations.post(
      `/${conversationId}/${action}`,
      input
    )
    return parseContract(ConversationLifecycleResultSchema, data)
  }

/** Closes the case, `status=closed` and releases the assignee. */
export const resolveConversation = lifecycle('resolve')
/** `status=pending` (waiting on the customer); keeps the assignee. */
export const setConversationPending = lifecycle('pending')
/** `status=open` again (opens or reopens a case). */
export const reopenConversation = lifecycle('reopen')
/** Back to the queue (`assignee=null`); status unchanged. */
export const releaseConversation = lifecycle('release')

/** Reassigns to another member with an optional internal note. */
export const transferConversation = async (
  conversationId: string,
  input: TransferConversationInput
): Promise<ConversationLifecycleResult> => {
  const { data } = await conversations.post(
    `/${conversationId}/transfer`,
    input
  )
  return parseContract(ConversationLifecycleResultSchema, data)
}

/** Sets (or clears with `null`) the priority; answers the updated list item. */
export const updateConversationPriority = async (
  conversationId: string,
  input: UpdateConversationPriorityInput
): Promise<Chat> => {
  const { data } = await conversations.patch(
    `/${conversationId}/priority`,
    input
  )
  return parseContract(ConversationListItemSchema, data)
}

/** Assignment history of a conversation, newest first. */
export const getAssignmentHistory = (
  conversationId: string
): Promise<ConversationAssignmentEntry[]> =>
  withDevFixture(
    async () => (await fixtures()).FIXTURE_ASSIGNMENTS,
    async () => {
      const { data } = await conversations.get(`/assignments/${conversationId}`)
      return parseContract(
        ConversationAssignmentEntrySchema.array(),
        data ?? []
      )
    }
  )

/** Opens (or reuses) a conversation, optionally assigning, tasking and templating. */
export const startConversation = async (
  input: StartConversationInput
): Promise<StartConversationResult> => {
  const { data } = await conversations.post('/start', input)
  return parseContract(StartConversationResultSchema, data)
}

/** Sends an approved template; the message itself arrives via the socket. */
export const sendConversationTemplate = async (
  conversationId: string,
  input: SendTemplateInput
): Promise<SendTemplateResult> => {
  const { data } = await conversations.post(
    `/${conversationId}/template`,
    input
  )
  return parseContract(SendTemplateResultSchema, data)
}

/**
 * Members of the active company. `withWorkload` adds the open conversations
 * and the live presence (assign/transfer picker).
 */
export const searchCompanyMembers = (
  search = '',
  { withWorkload = false }: { withWorkload?: boolean } = {}
): Promise<CompanyMemberResponse[]> =>
  withDevFixture(
    async () => {
      const term = search.trim().toLowerCase()
      return (await fixtures()).FIXTURE_MEMBERS.filter((member) =>
        [member.username, member.firstName, member.lastName].some((value) =>
          value?.toLowerCase().includes(term)
        )
      )
    },
    async () => {
      const { data } = await companyMembers.get('', {
        params: {
          q: search,
          limit: 20,
          ...(withWorkload ? { withWorkload: true } : {}),
        },
      })
      return parseContract(CompanyMemberResponseSchema.array(), data ?? [])
    }
  )

/** Customer tone of a conversation (`GET /conversations/:id/sentiment`). */
export const getConversationSentiment = async (
  conversationId: string
): Promise<ConversationSentiment> => {
  const { data } = await conversations.get(`/${conversationId}/sentiment`)

  return parseContract(ConversationSentimentSchema, data)
}

/** Latest support case of a conversation (`GET /conversations/:id/case`). */
export const getCurrentCase = async (
  conversationId: string
): Promise<CurrentCase> => {
  const { data } = await conversations.get(`/${conversationId}/case`)

  return parseContract(CurrentCaseSchema, data)
}
