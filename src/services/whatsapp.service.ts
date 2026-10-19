import {
  CHANNEL_TYPE,
  ChannelResponseSchema,
  WhatsAppConfigResponseSchema,
  WhatsAppConnectionTestSchema,
  type ChannelResponse,
  type UpdateChannelInput,
  type WhatsAppConfigResponse,
  type WhatsAppConnectionTest,
} from '@chat-crm/contracts'
import { client } from '@/lib/http'
import { parseContract } from '@/lib/contract-parse'

const ws = client('/channels')

const configResponse = ChannelResponseSchema.nullable()

/**
 * Contract parse: coerces wire values (dates); a drift fails immediately in
 * development and is only logged in production.
 */
const parseConfigResponse = (data: unknown): ChannelResponse | null =>
  parseContract(configResponse, data)

const whatsAppConfigResponse = WhatsAppConfigResponseSchema.nullable()

/** Includes the stored access token (this endpoint only) to prefill the form. */
export const getConfig = async (
  _businessId?: string
): Promise<WhatsAppConfigResponse | null> => {
  const { data } = await ws.get(`/whatsapp/config`)

    return parseContract(whatsAppConfigResponse, data)
}

export const saveConfig = async (
  _businessId: string,
  body: UpdateChannelInput
): Promise<ChannelResponse | null> => {
  const { data } = await ws.patch(`whatsapp/config`, body)
  const parsed = parseConfigResponse(data)

  // Every company is born with a `pending` WhatsApp channel, so PATCH finds
  // it; null only for a company that somehow has none (then create it).
  if (parsed) return parsed

  const { data: created } = await ws.post('', {
    type: CHANNEL_TYPE.whatsapp,
    ...body,
  })
  return parseConfigResponse(created)
}

/**
 * `POST /channels/whatsapp/test`: checks the SAVED channel (sending, webhook
 * handshake, Meta subscription). Always 200; each check says what failed.
 */
export const testConnection = async (): Promise<WhatsAppConnectionTest> => {
  const { data } = await ws.post('/whatsapp/test')
  return parseContract(WhatsAppConnectionTestSchema, data)
}

/**
 * TODO(api): v2 has no `POST /integration/whatsapp/send/template` (message
 * sending is socket-driven). Kept as a no-op so the chat error toast still
 * compiles; wire to the conversations endpoint when the API exposes it.
 */
export const sendTemplate = async (_to: string) => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn('[whatsapp] sendTemplate is not implemented in API v2')
  }
  return null
}
