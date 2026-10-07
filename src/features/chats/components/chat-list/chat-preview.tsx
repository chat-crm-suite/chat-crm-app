import type { MessageType } from '@chat-crm/contracts'
import { FileText, Film, ImageIcon, Music } from '../icons'
import { inferPreviewType } from '../../lib/preview-type'
import { truncatePreview } from '../../lib/preview-text'
import type { Chat } from '../../types/chat.domain'

const MEDIA: Partial<
  Record<MessageType, { icon: typeof ImageIcon; label: string }>
> = {
  image: { icon: ImageIcon, label: 'Imagen' },
  document: { icon: FileText, label: 'Documento' },
  audio: { icon: Music, label: 'Audio' },
  video: { icon: Film, label: 'Video' },
}

export const ChatPreview = ({ preview }: { preview: Chat['preview'] }) => {
  // The explicit type (list payload / live socket) wins; when a payload omits
  // it, the kind is inferred from the copy so attachments keep their label.
  const kind = inferPreviewType(preview?.content, preview?.type)
  const media = kind ? MEDIA[kind] : undefined
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
