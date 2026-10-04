import {
  WhatsAppConfigSchema,
  type UpdateWhatsAppConfigInput,
  type WhatsAppConfigResponse,
} from '@chat-crm/contracts'
import { client } from '@/lib/http'

const ws = client('/integration/whatsapp')

const configResponse = WhatsAppConfigSchema.nullable()

/**
 * Dev-only runtime check: if the API drifts from the shared contract the form
 * fails immediately in development instead of rendering wrong data.
 */
const parseConfigResponse = (
  data: unknown
): WhatsAppConfigResponse | null => {
  if (import.meta.env.DEV) return configResponse.parse(data)

  return data as WhatsAppConfigResponse | null
}

export const getConfig = async (
  businessId: string
): Promise<WhatsAppConfigResponse | null> => {
  const { data } = await ws.get(`/config`, {
    headers: {
      'x-company-id': businessId,
    },
  })

  return parseConfigResponse(data)
}

export const sendTemplate = async (to: string) => {
  const { data } = await ws.post('/send/template', { to })
  return data
}

export const saveConfig = async (
  businessId: string,
  body: UpdateWhatsAppConfigInput
): Promise<WhatsAppConfigResponse | null> => {
  const { data } = await ws.patch(`config`, body, {
    headers: {
      'x-company-id': businessId,
    },
  })

  return parseConfigResponse(data)
}
