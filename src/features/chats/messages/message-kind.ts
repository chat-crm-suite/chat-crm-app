import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { MessageView, MessageViewType } from '@chat-crm/contracts'
import type { ChatMessage } from '../types/chat.domain'

/** The view of one message kind, e.g. `ViewOf<'image'>`. */
export type ViewOf<K extends MessageViewType> = Extract<MessageView, { type: K }>

export interface MessageBodyProps<K extends MessageViewType> {
  view: ViewOf<K>
  message: ChatMessage
  /** Sent by the signed-in member (drives the tick). */
  isMine: boolean
  senderName: string
}

/**
 * Everything the app knows about one kind of message, in one place: how it
 * is named, which icon labels it, what the chat list previews and how the
 * thread renders it. Adding a kind is one entry; the registry's type makes
 * a missing one a compile error.
 */
export interface MessageKind<K extends MessageViewType> {
  label: string
  icon: LucideIcon
  /** Text for the chat list preview, or `null` to show the label. */
  preview: (view: ViewOf<K>) => string | null
  Body: ComponentType<MessageBodyProps<K>>
}

export type MessageKinds = { [K in MessageViewType]: MessageKind<K> }
