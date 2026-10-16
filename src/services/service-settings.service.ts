import {
  ServiceSettingsSchema,
  type ServiceSettings,
  type UpdateServiceSettingsInput,
} from '@chat-crm/contracts'
import { parseContract } from '@/lib/contract-parse'
import { client } from '@/lib/http'

const company = client('/company')

// Contract parse: coerces wire values (dates); strict in dev, tolerant in prod.
const parse = (data: unknown): ServiceSettings =>
  parseContract(ServiceSettingsSchema, data)

/** Business hours + first-response SLA of the active company. */
export const getServiceSettings = async () => {
  const { data } = await company.get('/service-settings')
  return parse(data)
}

/** `PUT /company/service-settings` (admin). */
export const updateServiceSettings = async (
  input: UpdateServiceSettingsInput
) => {
  const { data } = await company.put('/service-settings', input)
  return parse(data)
}
