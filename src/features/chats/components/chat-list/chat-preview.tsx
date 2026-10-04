import { cn } from '@/lib/utils'
import type { Chat } from '../../types/chat.domain'

export const ChatPreview = ({
  preview,
  isMe,
}: {
  preview: Chat['preview']
  isMe: boolean
}) => {
  // `preview.content` is the raw text of the last message (API list endpoint).
  const content = preview?.content
  const lastMsg = content ? (isMe ? `Yo: ${content}` : content) : ''

  return (
    <span
      className={cn(
        'col-start-2 row-span-2 row-start-2 line-clamp-2',
        'text-muted-foreground group-hover:text-accent-foreground/90 text-ellipsis'
      )}
    >
      {lastMsg}
    </span>
  )
}
