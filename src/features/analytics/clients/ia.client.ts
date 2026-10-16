import { IaStateSchema, IaStatusSchema } from '@chat-crm/contracts'
import { parseContract } from '@/lib/contract-parse'
import { client } from '@/lib/http'

const ia = client('/ia')
const iaAdmin = client('/admin/ia')

/** `GET /ia/status`: kill switch + circuit breaker, readable by any member. */
export const getIaStatus = async () => {
  const { data } = await ia.get('/status')
  return parseContract(IaStatusSchema, data)
}

/** `POST /admin/ia/toggle` (company admins). */
export const toggleIa = async (enabled: boolean) => {
  const { data } = await iaAdmin.post('/toggle', { enabled })
  return parseContract(IaStateSchema, data)
}
