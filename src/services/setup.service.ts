import {
  SetupResultSchema,
  SetupStatusSchema,
  type CreateSetupInput,
  type SetupResult,
  type SetupStatus,
} from '@chat-crm/contracts'

import { API_URL, client } from '@/lib/http'

export type {
  CreateSetupInput,
  CreateSetupInput as SetupPayload,
  SetupResult,
  SetupStatus,
}

const setup = client('/setup')

export const WEBHOOK_PATH = '/integration/webhook/whatsapp'

export const getWebhookUrl = () => `${API_URL}${WEBHOOK_PATH}`

export const getSetupStatus = async (): Promise<SetupStatus> => {
  const { data } = await setup.get('/status')

  // Dev-only runtime check: catches API/contract drift immediately.
  if (import.meta.env.DEV) return SetupStatusSchema.parse(data)

  return data as SetupStatus
}

export const runSetup = async (
  payload: CreateSetupInput
): Promise<SetupResult> => {
  const { data } = await setup.post('', payload)

  if (import.meta.env.DEV) return SetupResultSchema.parse(data)

  return data as SetupResult
}
