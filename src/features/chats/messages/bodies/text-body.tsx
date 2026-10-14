import { linkify } from '../linkify'
import type { MessageBodyProps } from '../message-kind'

export function TextBody({ view }: MessageBodyProps<'text'>) {
  return <p className='whitespace-pre-wrap'>{linkify(view.text)}</p>
}

/** Caption under a picture, video or document. */
export function Caption({ text }: { text: string }) {
  return (
    <p className='text-muted-foreground mt-1 text-xs whitespace-pre-wrap'>
      {linkify(text)}
    </p>
  )
}
