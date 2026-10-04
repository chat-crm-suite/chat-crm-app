import {
  ContactResponseSchema,
  type ContactResponse,
} from '@chat-crm/contracts'
import type { DataTableQuery } from '@/hooks/use-data-table'
import { client } from '@/lib/http'
import type { Pagination } from '@/models/types'

const contacts = client('/contacts')

/** Dev-only runtime check: catches API/contract drift immediately. */
const parseContacts = (data: unknown): ContactResponse[] => {
  if (import.meta.env.DEV) return ContactResponseSchema.array().parse(data)

  return data as ContactResponse[]
}

export const importContacts = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)

  return (await contacts.post<{ count: number }>('/import', formData)).data
}

export const saveContact = async (data: object) => {
  return await contacts.post('', data)
}

export const searchContacts = async (
  search: string
): Promise<ContactResponse[]> => {
  const { data } = await contacts.get('/search', { params: { q: search } })
  return parseContacts(data ?? [])
}

export const editContact = async (id: string, data: object) => {
  return await contacts.patch(`/${id}`, data)
}

export const getContactsDataTable = async (
  query: DataTableQuery<ContactResponse>
): Promise<Pagination<ContactResponse>> => {
  const { data } = await contacts.post<Pagination<ContactResponse>>(
    '/table',
    query
  )

  return data
}

// Alias kept for legacy callers (contacts data layer) — delegates to the table endpoint.
export const getContacts = async (
  params: DataTableQuery<ContactResponse>
): Promise<Pagination<ContactResponse>> => getContactsDataTable(params)

export const deleteContact = async (id: string) =>
  await contacts.delete(`/${id}`)
