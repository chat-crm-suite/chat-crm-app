import {
  ChannelResponseSchema,
  type ChannelResponse,
} from '@chat-crm/contracts'
import { parseContract } from '@/lib/contract-parse'
import { withDevFixture } from '@/lib/dev-fixtures'
import { client } from '@/lib/http'

const channels = client('/channels')

/** `GET /channels`: every channel of the active company (sanitized). */
export const listChannels = (): Promise<ChannelResponse[]> =>
  withDevFixture(
    async () =>
      (await import('@/features/chats/__fixtures__/conversations'))
        .FIXTURE_CHANNELS,
    async () => {
      const { data } = await channels.get('')
      return parseContract(ChannelResponseSchema.array(), data ?? [])
    }
  )
