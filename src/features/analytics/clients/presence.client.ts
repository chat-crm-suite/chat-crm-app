import { PresenceSchema, type ManualPresenceState } from '@chat-crm/contracts'
import { parseContract } from '@/lib/contract-parse'
import { client } from '@/lib/http'

const presence = client('/presence')

export const getMyPresence = async () => {
  const { data } = await presence.get('/me')
  return parseContract(PresenceSchema, data)
}

export const updatePresence = async (state: ManualPresenceState) => {
  const { data } = await presence.put('', { state })
  return parseContract(PresenceSchema, data)
}
