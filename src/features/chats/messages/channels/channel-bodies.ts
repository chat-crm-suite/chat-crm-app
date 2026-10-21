import type { ComponentType } from 'react'
import type { MessageViewType } from '@chat-crm/contracts'
import type { MessageBodyProps } from '../message-kind'

/**
 * Views a channel renders its own way, by message kind. A missing kind
 * falls back to the channel-agnostic view registered in `MESSAGE_KINDS`.
 */
export type ChannelBodies = {
  [K in MessageViewType]?: ComponentType<MessageBodyProps<K>>
}
