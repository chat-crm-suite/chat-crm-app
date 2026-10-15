import {
  CustomerResponseSchema,
  type CustomerResponse,
} from '@chat-crm/contracts'
import { client } from '@/lib/http'

const customers = client('/customers')

const parse = (data: unknown): CustomerResponse[] =>
  import.meta.env.DEV
    ? CustomerResponseSchema.array().parse(data)
    : (data as CustomerResponse[])

/** `GET /customers/search?q=`: a handful of matches for Ctrl+K. */
export const searchCustomers = async (
  q: string,
  signal?: AbortSignal
): Promise<CustomerResponse[]> => {
  const { data } = await customers.get('/search', { params: { q }, signal })
  return parse(data)
}
