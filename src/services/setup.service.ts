import { API_URL, client } from '@/lib/http'

export interface SetupStatus {
  initialized: boolean
  hasAdmin: boolean
  hasCompany: boolean
  hasWhatsapp: boolean
  hasUsers: boolean
  requiresSetupToken: boolean
}

export interface SetupWhatsappInput {
  businessId?: string
  accessToken?: string
  phoneNumberId?: string
  webhookUrl: string
  apiVersion?: string
}

export interface SetupPayload {
  setupToken?: string
  admin: {
    username: string
    password: string
    firstName?: string
    lastName?: string
    email?: string
    phoneNumber?: string
  }
  company: {
    name: string
    email?: string
    phoneNumber?: string
    address?: string
  }
  whatsapp?: SetupWhatsappInput
}

export interface SetupResult {
  user: { id: string; username: string }
  company: { id: string; name: string }
  whatsapp: { id: string; webhookVerifyToken: string } | null
}

const setup = client('/setup')

export const WEBHOOK_PATH = '/integration/webhook/whatsapp'

export const getWebhookUrl = () => `${API_URL}${WEBHOOK_PATH}`

export const getSetupStatus = async (): Promise<SetupStatus> =>
  (await setup.get<SetupStatus>('/status')).data

export const runSetup = async (payload: SetupPayload): Promise<SetupResult> =>
  (await setup.post<SetupResult>('', payload)).data
