import {
  UserResponseSchema,
  type UserResponse,
} from '@chat-crm/contracts'
import type { DataTableQuery } from '@/hooks/use-data-table'
import { client } from '@/lib/http'
import type { Pagination } from '@/models/types'

const users = client('/users')

/** Dev-only runtime check: catches API/contract drift immediately. */
const parseUsers = (data: unknown): UserResponse[] => {
  if (import.meta.env.DEV) return UserResponseSchema.array().parse(data)

  return data as UserResponse[]
}

export const importUsers = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)

  return (await users.post<{ count: number }>('/import', formData)).data
}

export const getUsers = async (): Promise<UserResponse[]> => {
  const { data } = await users.get('')
  return parseUsers(data)
}

export const getUsersTableData = async (query: DataTableQuery<UserResponse>) => {
  const { data } = await users.post<Pagination<UserResponse>>('/table', query)
  return data
}

export const searchUsers = async (search: string): Promise<UserResponse[]> => {
  const { data } = await users.get('/search', { params: { q: search } })
  return parseUsers(data)
}

export const saveUser = async (user: Partial<UserResponse>) => {
  return await users.post('', user)
}

export const editUser = async (id: string, user: Partial<UserResponse>) => {
  return await users.patch(`/${id}`, user)
}

export const deleteUser = async (id: string) => await users.delete(`/${id}`)
