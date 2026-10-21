import type { ComponentType } from 'react'
import type { ChannelType, MessageViewType } from '@chat-crm/contracts'
import type { MessageBodyProps } from '../message-kind'
import { kindOf } from '../registry'
import type { ChannelBodies } from './channel-bodies'
import { whatsappBodies } from './whatsapp'

/**
 * Channel-specific views, one folder per channel. A new channel adds its
 * folder and one entry here; channels without overrides need neither.
 */
const CHANNEL_BODIES: Partial<Record<ChannelType, ChannelBodies>> = {
  whatsapp: whatsappBodies,
}

/** The view of a message on a channel: its override, else the common one. */
export function bodyFor<K extends MessageViewType>(
  view: { type: K },
  channelType?: ChannelType | null
): ComponentType<MessageBodyProps<K>> {
  const override = channelType ? CHANNEL_BODIES[channelType]?.[view.type] : undefined
  // Same correlation limit as `kindOf`: the lookup is typed per key.
  return (override as ComponentType<MessageBodyProps<K>> | undefined) ?? kindOf(view).Body
}

export type { ChannelBodies }
