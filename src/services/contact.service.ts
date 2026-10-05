import {
  CustomerResponseSchema,
  type CustomerResponse,
} from '@chat-crm/contracts'
import type { DataTableQuery } from '@/hooks/use-data-table'
import { client } from '@/lib/http'
import type { Pagination } from '@/models/types'

const customers = client('/customers')

/** Dev-only runtime check: catches API/contract drift immediately. */
const parseCustomers = (data: unknown): CustomerResponse[] => {
  if (import.meta.env.DEV) return CustomerResponseSchema.array().parse(data)

  return data as CustomerResponse[]
}

export const importContacts = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)

  return (await customers.post<{ count: number }>('/import', formData)).data
}

export const saveContact = async (data: object) => {
  return await customers.post('', data)
}

export const searchContacts = async (
  search: string
): Promise<CustomerResponse[]> => {
  const { data } = await customers.get('/search', { params: { q: search } })
  return parseCustomers(data ?? [])
}

export const editContact = async (id: string, data: object) => {
  return await customers.patch(`/${id}`, data)
}

export const getContactsDataTable = async (
  query: DataTableQuery<CustomerResponse>
): Promise<Pagination<CustomerResponse>> => {
  const { data } = await customers.post<Pagination<CustomerResponse>>(
    '/table',
    query
  )

  return data
}

// Alias kept for legacy callers (contacts data layer) — delegates to the table endpoint.
export const getContacts = async (
  params: DataTableQuery<CustomerResponse>
): Promise<Pagination<CustomerResponse>> => getContactsDataTable(params)

export const deleteContact = async (id: string) =>
  await customers.delete(`/${id}`)
