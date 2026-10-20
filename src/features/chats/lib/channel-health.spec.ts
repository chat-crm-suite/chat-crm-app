import { describe, expect, it } from 'vitest'
import { makeChat } from '../testing/chats'
import {
  channelHealthOf,
  channelStatusPatch,
  firstChannelDown,
} from './channel-health'
import { applyChatPatch } from './chat-cache'

const down = (reason: string | null = 'El token venció.') =>
  makeChat({
    channel: {
      id: 'ch-1',
      type: 'whatsapp',
      name: 'WhatsApp Ventas',
      status: 'error',
      statusReason: reason,
    },
  })

describe('channel health', () => {
  it('is null for an active channel', () => {
    expect(channelHealthOf(makeChat())).toBeNull()
  })

  it('explains a broken channel with its reason and settings screen', () => {
    expect(channelHealthOf(down())).toEqual({
      channelId: 'ch-1',
      type: 'whatsapp',
      name: 'WhatsApp Ventas',
      status: 'error',
      reason: 'El token venció.',
      settingsPath: '/settings/integrations/whatsapp',
    })
    expect(channelHealthOf(down(null))?.reason).toMatch(/Meta rechazó/)
  })

  it('finds the first broken channel across the list tabs', () => {
    expect(firstChannelDown([[makeChat()], undefined])).toBeNull()
    expect(firstChannelDown([[makeChat()], [down()]])?.channelId).toBe('ch-1')
  })

  it('moves every conversation of the channel with the socket event', () => {
    const event = {
      channelId: 'ch-1',
      type: 'whatsapp' as const,
      name: 'WhatsApp Ventas',
      status: 'active' as const,
      statusReason: null,
      at: new Date(),
    }
    const patched = applyChatPatch(down(), channelStatusPatch(event))
    expect(patched.channel).toMatchObject({
      status: 'active',
      statusReason: null,
    })

    const other = makeChat({
      channel: {
        id: 'ch-9',
        type: 'whatsapp',
        name: 'Otro',
        status: 'error',
        statusReason: 'x',
      },
    })
    expect(
      applyChatPatch(other, channelStatusPatch(event)).channel.status
    ).toBe('error')
  })
})
