import {
  schema as WhatsappConfigSchema,
  type WhatsAppConfigInput,
} from '@/schemas/whatsapp-config.schema'
import { client } from '@/lib/http'

const ws = client('/integration/whatsapp')

export const getConfig = async (businessID: string) => {
  const { data } = await ws.get(`/config`, {
    headers: {
      'x-company-id': businessID,
    },
  })
  const result = WhatsappConfigSchema.loose().safeParse(data)

  if (!result.success) throw new Error('Datos inválidos del backend')

  return result.data
}

export const sendTemplate = async (to: string) => {
  const { data } = await ws.post('/send/template', { to })
  return data
}

export const saveConfig = async (
  businessId: string,
  body: WhatsAppConfigInput
) => {
  const { data } = await ws.patch<WhatsAppConfigInput>(`config`, body, {
    headers: {
      'x-company-id': businessId,
    },
  })
  const result = WhatsappConfigSchema.safeParse(data)

  if (!result.success) throw new Error('Datos inválidos del backend')

  return result.data
}
