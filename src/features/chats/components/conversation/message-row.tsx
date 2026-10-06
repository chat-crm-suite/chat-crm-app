import { format } from 'date-fns'
import {
  Check,
  CheckCheck,
  CircleAlert,
  Clock3,
  FileText,
  FileWarning,
  RefreshCcw,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import type { ChatMessage } from '../../types/chat.domain'

/** Identity of the message author as resolved by the thread. */
export interface SenderView {
  name: string
  initials: string
}

type AttachmentState = 'pending' | 'ready' | 'failed'

/** A message added moments ago enters with a short, state-driven animation. */
const RECENT_WINDOW_MS = 1500

/**
 * Attachment lifecycle for one message. The v2 payload carries
 * `attachmentStatus`; when it is missing (legacy rows) the file is considered
 * ready only if it has a url, and unavailable once the message is not pending.
 */
function getAttachmentState(message: ChatMessage): AttachmentState | null {
  if (message.msg.type === 'text') return null
  if (message.msg.attachmentStatus) return message.msg.attachmentStatus

  const content = message.msg.content
  const link = 'link' in content ? content.link : undefined
  if (message.msg.mediaUrl ?? link) return 'ready'
  if (message.status === 'pending') return 'pending'
  return 'failed'
}

export function StatusTick({
  status,
  className,
}: {
  status: ChatMessage['status']
  className?: string
}) {
  const size = className ?? 'size-3.5'
  switch (status) {
    case 'pending':
      return <Clock3 className={size} aria-label='Enviando' />
    case 'sent':
      return <Check className={size} aria-label='Enviado' />
    case 'delivered':
      return <CheckCheck className={size} aria-label='Entregado' />
    case 'read':
      return (
        <CheckCheck
          className={cn(size, 'text-sky-600 dark:text-sky-400')}
          aria-label='Leído'
        />
      )
    case 'failed':
      return (
        <CircleAlert className={cn(size, 'text-destructive')} aria-label='Falló' />
      )
    default:
      return null
  }
}

function RetryButton({
  message,
  onRetry,
}: {
  message: ChatMessage
  onRetry: (message: ChatMessage) => void
}) {
  return (
    <Button
      type='button'
      variant='link'
      size='sm'
      onClick={() => onRetry(message)}
      className='text-destructive h-auto gap-1 p-0 text-xs font-medium'
    >
      <RefreshCcw className='size-3' />
      Reintentar
    </Button>
  )
}

export function MessageRow({
  message,
  sender,
  onRetry,
  className,
}: {
  message: ChatMessage
  sender: SenderView
  onRetry: (message: ChatMessage) => void
  className?: string
}) {
  const at = new Date(message.timestamp)
  const content = message.msg.content
  const body = 'body' in content ? content.body : undefined
  const caption = 'caption' in content ? content.caption : undefined
  const filename = 'filename' in content ? content.filename : undefined
  const attachment = getAttachmentState(message)
  const media = message.msg.mediaUrl ?? undefined
  const isOutbound = message.sender.type === 'member'
  const isPending = message.status === 'pending'
  const isFailed = isOutbound && message.status === 'failed'
  const isRecent = Date.now() - at.getTime() < RECENT_WINDOW_MS

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
            isOutbound ? 'bg-primary text-primary-foreground' : 'bg-muted'
          )}
        >
          {sender.initials}
        </AvatarFallback>
      </Avatar>

      <div className='min-w-0 flex-1'>
        <div className='flex items-baseline gap-2'>
          <span className='text-xs font-semibold'>{sender.name}</span>
          <span className='text-muted-foreground flex items-center gap-1 text-[11px] tabular-nums'>
            {format(at, 'HH:mm')}
            {isOutbound && (
              <StatusTick status={message.status} className='size-3' />
            )}
          </span>
        </div>

        <div className='mt-0.5 text-sm leading-relaxed wrap-break-word'>
          {message.msg.type === 'text' && body}

          {message.msg.type !== 'text' && attachment === 'pending' && (
            <span className='bg-muted/40 text-muted-foreground flex w-fit items-center gap-2 rounded-xl border px-3 py-2 text-xs'>
              <Spinner aria-label='Cargando' className='size-4' />
              Cargando archivo…
            </span>
          )}

          {message.msg.type !== 'text' && attachment === 'failed' && (
            <span className='flex w-fit items-center gap-2 rounded-xl border border-dashed px-3 py-2 text-xs'>
              <FileWarning className='text-destructive size-4 shrink-0' />
              <span className='min-w-0'>
                <span className='block truncate font-medium'>
                  {filename ?? 'Archivo'}
                </span>
                <span className='text-muted-foreground block'>
                  Archivo no disponible
                </span>
              </span>
            </span>
          )}

          {message.msg.type === 'image' && attachment === 'ready' && media && (
            <span className='relative mt-1 block w-fit max-w-full'>
              <img
                src={media}
                alt={caption ?? 'Imagen'}
                loading='lazy'
                decoding='async'
                className='bg-muted aspect-[3/2] max-h-64 w-full max-w-xs rounded-xl border object-cover'
              />
              {caption ? (
                <span className='text-muted-foreground mt-1 block text-xs'>
                  {caption}
                </span>
              ) : (
                <span
                  data-testid='image-meta-overlay'
                  className='bg-foreground/60 text-background absolute end-2.5 bottom-2.5 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] leading-none'
                >
                  <time dateTime={at.toISOString()} className='tabular-nums'>
                    {format(at, 'HH:mm')}
                  </time>
                  {isOutbound && (
                    <StatusTick status={message.status} className='size-3' />
                  )}
                </span>
              )}
            </span>
          )}

          {message.msg.type === 'document' && attachment === 'ready' && (
            <span className='block'>
              <span className='mt-1 flex w-fit items-center gap-2 rounded-xl border px-3 py-2'>
                <FileText className='size-4 shrink-0' />
                <span className='min-w-0 truncate text-[13px] font-medium'>
                  {filename ?? 'Documento'}
                </span>
              </span>
              {caption && (
                <span className='text-muted-foreground mt-1 block text-xs'>
                  {caption}
                </span>
              )}
            </span>
          )}
        </div>

        {isFailed && (
          <div className='mt-1'>
            <RetryButton message={message} onRetry={onRetry} />
          </div>
        )}
      </div>
    </div>
  )
}
