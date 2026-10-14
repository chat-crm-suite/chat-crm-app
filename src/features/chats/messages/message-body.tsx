import type { MessageViewType } from '@chat-crm/contracts'
import type { MessageBodyProps } from './message-kind'
import { kindOf } from './registry'

/** Renders the body of any message view through its registered kind. */
export function MessageBody(props: MessageBodyProps<MessageViewType>) {
  const { Body } = kindOf(props.view)
  return <Body {...props} />
}
