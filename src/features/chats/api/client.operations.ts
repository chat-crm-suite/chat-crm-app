import { CustomerResponseSchema } from '@chat-crm/contracts'
import { parseContract } from '@/lib/contract-parse'
import { client } from '@/lib/http'
import type { Client } from '../types/client.api'

const customers = client('/customers')

export const searchClient = async (search: string): Promise<Client[]> => {
  const { data } = await customers.get('/search', {
    params: { q: search },
  })

  return parseContract(CustomerResponseSchema.array(), data ?? []) as Client[]
}
