import {
  CompanyMemberResponseSchema,
  type CompanyMemberResponse,
} from '@chat-crm/contracts'
import { client } from '@/lib/http'
import type { Chat } from '@/features/chats/types/chat.domain'

const conversations = client('/conversations')
const companyMembers = client('/company-members')

export const getChatList = async (): Promise<Chat[]> => {
  try {
    const response = await conversations.get<Chat[]>('/list')

    return response?.data ?? []
  } catch (error) {
    console.error('Error al obtener la lista de conversaciones:', error)
    return []
  }
}

/** Cola de conversaciones sin asignar de la empresa (para reclamar). */
export const getUnassignedChats = async (): Promise<Chat[]> => {
  try {
    const response = await conversations.get<Chat[]>('/unassigned')

    return response?.data ?? []
  } catch {
    return []
  }
}

/** Reclama una conversación libre para el miembro actual (409 si es de otro). */
export const claimChat = async (conversationId: string) => {
  const { data } = await conversations.post(`/${conversationId}/claim`)

  return data
}

/** Conversaciones cuyo último mensaje es del cliente y llevan `minutes` sin respuesta. */
export const getNeedsResponseChats = async (minutes = 15): Promise<Chat[]> => {
  try {
    const response = await conversations.get<Chat[]>('/needs-response', {
      params: { minutes },
    })

    return response?.data ?? []
  } catch {
    return []
  }
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

  // Dev-only runtime check: catches API/contract drift immediately.
  if (import.meta.env.DEV) {
    return CompanyMemberResponseSchema.array().parse(data)
  }

  return (data ?? []) as CompanyMemberResponse[]
}
