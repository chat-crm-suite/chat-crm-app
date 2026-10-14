import { PresenceSchema, type ManualPresenceState } from '@chat-crm/contracts'
import { client } from '@/lib/http'
import { devParse } from '../lib/dev-parse'

const presence = client('/presence')

export const getMyPresence = async () => {
  const { data } = await presence.get('/me')
  return devParse(PresenceSchema, data)
}

export const updatePresence = async (state: ManualPresenceState) => {
  const { data } = await presence.put('', { state })
  return devParse(PresenceSchema, data)
}
