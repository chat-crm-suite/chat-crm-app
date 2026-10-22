import {
  CHANNEL_STATUS,
  isChannelSendable,
  type ChannelStatus,
  type ChannelStatusChanged,
  type ChannelType,
} from '@chat-crm/contracts'
import { CHANNEL_LABEL, copy } from '../copy'
import type { Chat } from '../types/chat.domain'
import type { ChatPatch } from './chat-cache'

/** Why a conversation cannot send, or null when its channel is connected. */
export type ChannelHealth = {
  channelId: string
  type: ChannelType
  name: string
  status: ChannelStatus
  reason: string
  /** Settings screen that fixes this channel type, when there is one. */
  settingsPath: '/settings/integrations/whatsapp' | null
}

const SETTINGS_PATH: Partial<
  Record<ChannelType, '/settings/integrations/whatsapp'>
> = {
  whatsapp: '/settings/integrations/whatsapp',
}

export function channelHealthOf(chat: Chat): ChannelHealth | null {
  const channel = chat.channel
  if (!channel || isChannelSendable(channel.status)) return null

  return {
    channelId: channel.id,
    type: channel.type,
    name: channel.name || CHANNEL_LABEL[channel.type],
    status: channel.status,
    reason:
      channel.statusReason ??
      (channel.status === CHANNEL_STATUS.pending
        ? copy.channelPendingReason
        : copy.channelDownFallbackReason),
    settingsPath: SETTINGS_PATH[channel.type] ?? null,
  }
}

/** First broken channel among the listed conversations (list header dot). */
export function firstChannelDown(
  lists: ReadonlyArray<readonly Chat[] | undefined>
): ChannelHealth | null {
  for (const list of lists) {
    for (const chat of list ?? []) {
      const health = channelHealthOf(chat)
      if (health) return health
    }
  }
  return null
}

/** `channel:status:changed`: every conversation of that channel moves with it. */
export function channelStatusPatch(event: ChannelStatusChanged): ChatPatch {
  return (chat) =>
    chat.channel?.id === event.channelId
      ? {
          ...chat,
          channel: {
            ...chat.channel,
            status: event.status,
            statusReason: event.statusReason,
          },
        }
      : chat
}
