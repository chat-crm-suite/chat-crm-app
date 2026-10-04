import { client } from '@/lib/http'
import type { Chat } from '@/features/chats/types/chat.domain'

const chats = client('/chats')

export const getChatList = async () => {
  try {
    const response = await chats.get<Chat[]>('/list')

    return response?.data ?? []
  } catch (error) {
    console.error('Error al obtener la lista de chats:', error)
    return []
  }
}

/** Cola de chats sin asignar de la empresa (para reclamar). */
export const getUnassignedChats = async (): Promise<Chat[]> => {
  try {
    const response = await chats.get<Chat[]>('/unassigned')

    return response?.data ?? []
  } catch {
    return []
  }
}

/** Reclama un chat libre para el usuario actual (409 si es de otro agente). */
export const claimChat = async (chatId: string) => {
  const { data } = await chats.post(`/${chatId}/claim`)

  return data
}

/** Chats cuyo último mensaje es del cliente y llevan `minutes` sin respuesta. */
export const getNeedsResponseChats = async (minutes = 15): Promise<Chat[]> => {
  try {
    const response = await chats.get<Chat[]>('/needs-response', {
      params: { minutes },
    })

    return response?.data ?? []
  } catch {
    return []
  }
}

export const createChat = async (agentId: string, contactId: string) => {
  const res = await chats.post<Chat>('', {
    title: 'new chat',
    contactId,
    agentId,
  })

  return res?.data ?? []
}

/** Asignación manual / reasignación (solo supervisores pueden quitar dueño). */
export const assignedUser = async (chatId: string, agentId: string) => {
  const { data } = await chats.post('/assign', { chatId, agentId })

  return data
}

type MessageContent = {
  id: string
  senderType: string
  senderId: string
  content: string
  type: string
  status: string
  direction: string
  createdAt: string
  updatedAt: string
  mediaUrl: string | null
  deletedAt: string | null
  chat: string
}

export const getMessagesByChatId = async (
  chatId: string
): Promise<MessageContent[]> => {
  const response = await chats.get<MessageContent[]>(`/${chatId}/messages`)
  return response?.data ?? []
}
