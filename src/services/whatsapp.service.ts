import {
  ChannelResponseSchema,
  type ChannelResponse,
  type UpdateChannelInput,
} from '@chat-crm/contracts'
import { client } from '@/lib/http'

const ws = client('/channels')

const configResponse = ChannelResponseSchema.nullable()

/**
 * Dev-only runtime check: if the API drifts from the shared contract the form
 * fails immediately in development instead of rendering wrong data.
 */
const parseConfigResponse = (data: unknown): ChannelResponse | null => {
  if (import.meta.env.DEV) return configResponse.parse(data)

  return data as ChannelResponse | null
}

export const getConfig = async (
  _businessId?: string
): Promise<ChannelResponse | null> => {
  const { data } = await ws.get(`/whatsapp/config`)

  return parseConfigResponse(data)
}

export const saveConfig = async (
  _businessId: string,
  body: UpdateChannelInput
): Promise<ChannelResponse | null> => {
  const { data } = await ws.patch(`whatsapp/config`, body)
  const parsed = parseConfigResponse(data)

  // First-time setup: PATCH returns null when no WhatsApp channel exists yet.
  if (parsed) return parsed

  const { data: created } = await ws.post('', { type: 'whatsapp', ...body })
  return parseConfigResponse(created)
}

/**
 * TODO(api): v2 has no `POST /integration/whatsapp/send/template` (message
 * sending is socket-driven). Kept as a no-op so the chat error toast still
 * compiles; wire to the conversations endpoint when the API exposes it.
 */
export const sendTemplate = async (_to: string) => {
  if (import.meta.env.DEV) {
    console.warn('[whatsapp] sendTemplate is not implemented in API v2')
  }
  return null
}
