import type { MessageViewType } from '@chat-crm/contracts'
import { bodyFor } from './channels'
import type { MessageBodyProps } from './message-kind'

/**
 * Renders the body of any message view: the channel's own view when it has
 * one (`channels/`), else the channel-agnostic kind (`bodies/`).
 */
export function MessageBody(props: MessageBodyProps<MessageViewType>) {
  const Body = bodyFor(props.view, props.channelType)
  return <Body {...props} />
}
