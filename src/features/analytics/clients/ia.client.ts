import { IaStateSchema, IaStatusSchema } from '@chat-crm/contracts'
import { client } from '@/lib/http'
import { devParse } from '../lib/dev-parse'

const ia = client('/ia')
const iaAdmin = client('/admin/ia')

/** `GET /ia/status`: kill switch + circuit breaker, readable by any member. */
export const getIaStatus = async () => {
  const { data } = await ia.get('/status')
  return devParse(IaStatusSchema, data)
}

/** `POST /admin/ia/toggle` (company admins). */
export const toggleIa = async (enabled: boolean) => {
  const { data } = await iaAdmin.post('/toggle', { enabled })
  return devParse(IaStateSchema, data)
}
