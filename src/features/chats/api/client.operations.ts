import { CustomerResponseSchema } from '@chat-crm/contracts'
import { client } from '@/lib/http'
import type { Client } from '../types/client.api'

const customers = client('/customers')

export const searchClient = async (search: string): Promise<Client[]> => {
  const { data } = await customers.get('/search', {
    params: { q: search },
  })

  // Dev-only runtime check: catches API/contract drift immediately.
  if (import.meta.env.DEV) return CustomerResponseSchema.array().parse(data)

  return (data ?? []) as Client[]
}
