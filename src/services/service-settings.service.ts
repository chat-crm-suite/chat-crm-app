import {
  ServiceSettingsSchema,
  type ServiceSettings,
  type UpdateServiceSettingsInput,
} from '@chat-crm/contracts'
import { client } from '@/lib/http'

const company = client('/company')

// Dev-only runtime check: catches API/contract drift immediately.
const parse = (data: unknown): ServiceSettings =>
  import.meta.env.DEV
    ? ServiceSettingsSchema.parse(data)
    : (data as ServiceSettings)

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
