import {
  SetupResultSchema,
  SetupStatusSchema,
  SetupStepResultSchema,
  type CreateSetupInput,
  type SetupResult,
  type SetupStatus,
  type SetupStepResult,
  type ValidateSetupStepInput,
} from '@chat-crm/contracts'

import { API_URL, client } from '@/lib/http'
import { parseContract } from '@/lib/contract-parse'

export type {
  CreateSetupInput,
  CreateSetupInput as SetupPayload,
  SetupResult,
  SetupStatus,
  SetupStepResult,
  ValidateSetupStepInput,
}

const setup = client('/setup')

export const WEBHOOK_PATH = '/integration/webhook/whatsapp'

export const getWebhookUrl = () => `${API_URL}${WEBHOOK_PATH}`

export const getSetupStatus = async (): Promise<SetupStatus> => {
  const { data } = await setup.get('/status')

  // Contract parse: coerces wire values (dates); strict in dev, tolerant in prod.
    return parseContract(SetupStatusSchema, data)
}

export const runSetup = async (
  payload: CreateSetupInput
): Promise<SetupResult> => {
  const { data } = await setup.post('', payload)

    return parseContract(SetupResultSchema, data)
}

/** Server-side check of ONE wizard step before moving on (`POST /setup/validate`). */
export const validateSetupStep = async (
  input: ValidateSetupStepInput
): Promise<SetupStepResult> => {
  const { data } = await setup.post('/validate', input)

    return parseContract(SetupStepResultSchema, data)
}
