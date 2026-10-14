import { linkify } from '../linkify'
import { MessageMeta } from '../message-meta'
import type { MessageBodyProps } from '../message-kind'

export function TextBody({ view, message, isMine }: MessageBodyProps<'text'>) {
  return (
    <p className='whitespace-pre-wrap'>
      {linkify(view.text)}
      <MessageMeta message={message} isMine={isMine} />
    </p>
  )
}

/** Caption under a picture, video or document, with the message time. */
export function Caption({
  text,
  ...meta
}: { text: string } & Pick<MessageBodyProps<'text'>, 'message' | 'isMine'>) {
  return (
    <p className='px-2 pt-1.5 pb-1 whitespace-pre-wrap'>
      {linkify(text)}
      <MessageMeta {...meta} />
    </p>
  )
}
