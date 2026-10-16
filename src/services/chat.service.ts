import {
  CaseSchema,
  CompanyMemberResponseSchema,
  CurrentCaseSchema,
  type Case,
  type CloseCaseInput,
  type CurrentCase,
  ConversationSentimentSchema,
  type CompanyMemberResponse,
  type ConversationSentiment,
} from '@chat-crm/contracts'
import { parseContract } from '@/lib/contract-parse'
import { client } from '@/lib/http'
import type { Chat } from '@/features/chats/types/chat.domain'

const conversations = client('/conversations')
const companyMembers = client('/company-members')

export const getChatList = async (): Promise<Chat[]> => {
  const response = await conversations.get<Chat[]>('/list')

  return response?.data ?? []
}

/** Cola de conversaciones sin asignar de la empresa (para reclamar). */
export const getUnassignedChats = async (): Promise<Chat[]> => {
  const response = await conversations.get<Chat[]>('/unassigned')

  return response?.data ?? []
}

/** Reclama una conversación libre para el miembro actual (409 si es de otro). */
export const claimChat = async (conversationId: string) => {
  const { data } = await conversations.post(`/${conversationId}/claim`)

  return data
}

/** Conversaciones cuyo último mensaje es del cliente y llevan `minutes` sin respuesta. */
export const getNeedsResponseChats = async (minutes = 15): Promise<Chat[]> => {
  const response = await conversations.get<Chat[]>('/needs-response', {
    params: { minutes },
  })

  return response?.data ?? []
}

/** Asignación manual / reasignación por member id (solo supervisores pueden quitar dueño). */
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

/** Miembros de la empresa activa para el selector de asignación. */
export const searchCompanyMembers = async (
  search = ''
): Promise<CompanyMemberResponse[]> => {
  const { data } = await companyMembers.get('', {
    params: { q: search, limit: 20 },
  })

  return parseContract(CompanyMemberResponseSchema.array(), data ?? [])
}

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

/** Resolves the open case (`POST /conversations/:id/close`, 409 if none). */
export const closeCase = async (
  conversationId: string,
  input: CloseCaseInput = {}
): Promise<Case> => {
  const { data } = await conversations.post(`/${conversationId}/close`, input)

  return parseContract(CaseSchema, data)
}
