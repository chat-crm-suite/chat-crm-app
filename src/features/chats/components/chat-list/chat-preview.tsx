import { labelOf } from '../../messages/registry'
import { truncatePreview } from '../../lib/preview-text'
import type { Chat } from '../../types/chat.domain'

export const ChatPreview = ({ preview }: { preview: Chat['preview'] }) => {
  // Non-text kinds get their icon and label (the caption, if any, follows);
  // the API always sends the kind of the last message.
  const media =
    preview?.type && preview.type !== 'text' ? labelOf(preview.type) : undefined
  const raw = preview?.content?.trim() || media?.label
  const content = raw ? truncatePreview(raw) : undefined

  if (!content) return null

  return (
    <span className='text-muted-foreground group-hover:text-accent-foreground/90 flex max-w-[80%] min-w-0 items-center gap-1 text-[13px]'>
      {media && (
        <>
          <media.icon aria-hidden='true' className='size-3 shrink-0' />
          <span className='sr-only'>{media.label}: </span>
        </>
      )}
      <span className='min-w-0 truncate'>{content}</span>
    </span>
  )
}
