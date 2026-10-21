import type { ChannelType } from '@chat-crm/contracts'
import { format } from 'date-fns'
import { Copy, Download, RefreshCcw, Sticker } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { resolveMediaUrl } from '@/lib/media-url'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { MessageBody } from '../../messages/message-body'
import { StatusTick } from '../../messages/message-meta'
import type { ChatMessage } from '../../types/chat.domain'

/** Identity of the message author as resolved by the thread. */
export interface SenderView {
  name: string
  initials: string
}

/** A message added moments ago enters with a short, state-driven animation. */
const RECENT_WINDOW_MS = 1500

/** Text worth copying from a message (its text or caption). */
function copyableText(message: ChatMessage): string | null {
  const { msg } = message
  if (msg.type === 'text') return msg.text
  if ('caption' in msg) return msg.caption
  if (msg.type === 'unsupported') return msg.text
  if (msg.type === 'template') return msg.body
  return null
}

/** The file of a media message, once the API serves it. */
function downloadUrl(message: ChatMessage): string | undefined {
  const { msg } = message
  const media =
    'media' in msg
      ? msg.media
      : msg.type === 'template' && msg.header?.kind === 'media'
        ? msg.header.media
        : null
  if (!media || media.status !== 'ready') return undefined
  return resolveMediaUrl(media.url)
}

export function MessageRow({
  message,
  sender,
  onRetry,
  onResendSticker,
  channelType,
  className,
}: {
  message: ChatMessage
  sender: SenderView
  onRetry: (message: ChatMessage) => void
  /** Re-sends a stored sticker by reference (no upload). */
  onResendSticker?: (sticker: { attachmentId: string; url: string }) => void
  /** Channel of the conversation: picks channel-specific message views. */
  channelType?: ChannelType | null
  className?: string
}) {
  const at = new Date(message.timestamp)
  const isMine = message.sender.type === 'member'
  const isPending = message.status === 'pending'
  const isFailed = isMine && message.status === 'failed'
  const isRecent = Date.now() - at.getTime() < RECENT_WINDOW_MS
  const text = copyableText(message)
  const fileUrl = downloadUrl(message)
  const sticker =
    message.msg.type === 'sticker' && message.msg.media.attachmentId && fileUrl
      ? { attachmentId: message.msg.media.attachmentId, url: fileUrl }
      : null

  return (
    <div
      className={cn(
        'flex gap-2.5',
        isPending && 'opacity-70 transition-opacity duration-200',
        isRecent && 'motion-safe:animate-message-in',
        className
      )}
    >
      <Avatar className='mt-0.5 size-7 shrink-0'>
        <AvatarFallback
          className={cn(
            'text-[10px] font-semibold',
            isMine ? 'bg-primary text-primary-foreground' : 'bg-muted'
          )}
        >
          {sender.initials}
        </AvatarFallback>
      </Avatar>

      <div className='min-w-0 flex-1'>
        <div className='flex items-baseline gap-2'>
          <span className='text-xs font-semibold'>{sender.name}</span>
          <span className='text-muted-foreground flex items-center gap-1 text-[11px] tabular-nums'>
            <time dateTime={at.toISOString()}>{format(at, 'HH:mm')}</time>
            {isMine && <StatusTick status={message.status} className='size-3' />}
          </span>
        </div>

        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className='mt-0.5 w-fit max-w-full text-sm leading-relaxed wrap-break-word'>
              <MessageBody
                view={message.msg}
                message={message}
                isMine={isMine}
                senderName={sender.name}
                channelType={channelType}
              />
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            {text && (
              <ContextMenuItem
                onSelect={() =>
                  void navigator.clipboard
                    ?.writeText(text)
                    .then(() => toast.success('Texto copiado'))
                }
              >
                <Copy />
                Copiar texto
              </ContextMenuItem>
            )}
            {fileUrl && (
              <ContextMenuItem asChild>
                <a href={fileUrl} download>
                  <Download />
                  Descargar
                </a>
              </ContextMenuItem>
            )}
            {sticker && onResendSticker && (
              <ContextMenuItem onSelect={() => onResendSticker(sticker)}>
                <Sticker />
                Enviar este sticker
              </ContextMenuItem>
            )}
            {isFailed && (
              <ContextMenuItem onSelect={() => onRetry(message)}>
                <RefreshCcw />
                Reintentar
              </ContextMenuItem>
            )}
            {!text && !fileUrl && !isFailed && (
              <ContextMenuItem disabled>Sin acciones</ContextMenuItem>
            )}
          </ContextMenuContent>
        </ContextMenu>

        {isFailed && (
          <div className='mt-1'>
            <Button
              type='button'
              variant='link'
              size='sm'
              onClick={() => onRetry(message)}
              className='text-destructive h-auto min-h-11 gap-1 p-0 text-xs font-medium sm:min-h-0'
            >
              <RefreshCcw className='size-3' />
              Reintentar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
