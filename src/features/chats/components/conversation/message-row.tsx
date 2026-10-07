import { useState } from 'react'
import { format } from 'date-fns'
import {
  Check,
  CheckCheck,
  CircleAlert,
  Clock3,
  Download,
  FileText,
  FileWarning,
  RefreshCcw,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { resolveMediaUrl } from '@/lib/media-url'
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from '@/components/ui/attachment'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { documentMeta } from '../../lib/attachment-meta'
import type { ChatMessage } from '../../types/chat.domain'
import { ImageLightbox } from './image-lightbox'

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
  const tickClassName = className ?? 'size-3.5'
  switch (status) {
    case 'pending':
      return <Clock3 className={tickClassName} aria-label='Enviando' />
    case 'sent':
      return <Check className={tickClassName} aria-label='Enviado' />
    case 'delivered':
      return <CheckCheck className={tickClassName} aria-label='Entregado' />
    case 'read':
      return (
        <CheckCheck
          className={cn(tickClassName, 'text-sky-600 dark:text-sky-400')}
          aria-label='Leído'
        />
      )
    case 'failed':
      return (
        <CircleAlert
          className={cn(tickClassName, 'text-destructive')}
          aria-label='Falló'
        />
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
      className='text-destructive h-auto min-h-11 gap-1 p-0 text-xs font-medium sm:min-h-0'
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
  const [viewerOpen, setViewerOpen] = useState(false)
  const at = new Date(message.timestamp)
  const content = message.msg.content
  const body = 'body' in content ? content.body : undefined
  const caption = 'caption' in content ? content.caption : undefined
  const filename = 'filename' in content ? content.filename : undefined
  const attachment = getAttachmentState(message)
  const media = resolveMediaUrl(message.msg.mediaUrl)
  const documentName = filename ?? 'Documento'
  const documentDescription = documentMeta({
    mimeType: message.msg.mimeType,
    sizeBytes: message.msg.sizeBytes,
    filename,
  })
  const isMine = message.sender.type === 'member'
  const isPending = message.status === 'pending'
  const isFailed = isMine && message.status === 'failed'
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
            {format(at, 'HH:mm')}
            {isMine && (
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
            <>
              <span className='relative mt-1 block w-fit max-w-[min(20.5rem,100%)]'>
                <button
                  type='button'
                  onClick={() => setViewerOpen(true)}
                  aria-label='Ampliar imagen'
                  className='group/image block w-fit max-w-full cursor-zoom-in overflow-hidden rounded-xl border p-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                >
                  <img
                    src={media}
                    alt={caption ?? 'Imagen'}
                    loading='lazy'
                    decoding='async'
                    className='bg-muted block h-auto max-h-[26rem] w-auto max-w-full transition duration-200 motion-safe:group-hover/image:brightness-105 motion-safe:group-focus-visible/image:brightness-105'
                  />
                </button>
                {caption ? (
                  <span className='text-muted-foreground mt-1 block text-xs'>
                    {caption}
                  </span>
                ) : (
                  <span
                    data-testid='image-meta-overlay'
                    className='bg-foreground/60 text-background pointer-events-none absolute end-2.5 bottom-2.5 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] leading-none'
                  >
                    <time dateTime={at.toISOString()} className='tabular-nums'>
                      {format(at, 'HH:mm')}
                    </time>
                    {isMine && (
                      <StatusTick status={message.status} className='size-3' />
                    )}
                  </span>
                )}
              </span>
              <ImageLightbox
                open={viewerOpen}
                onOpenChange={setViewerOpen}
                src={media}
                alt={caption ?? 'Imagen'}
                caption={caption}
                senderName={sender.name}
                timestamp={at}
              />
            </>
          )}

          {message.msg.type === 'document' && attachment === 'ready' && (
            <span className='mt-1 block'>
              <Attachment state='done' className='max-w-[min(22rem,100%)]'>
                <AttachmentMedia>
                  <FileText />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>{documentName}</AttachmentTitle>
                  {documentDescription && (
                    <AttachmentDescription>
                      {documentDescription}
                    </AttachmentDescription>
                  )}
                </AttachmentContent>
                {media && (
                  <AttachmentActions>
                    <AttachmentAction
                      asChild
                      size='icon-sm'
                      variant='secondary'
                    >
                      <a
                        href={media}
                        download={filename ?? ''}
                        aria-label={`Descargar ${documentName}`}
                      >
                        <Download />
                      </a>
                    </AttachmentAction>
                  </AttachmentActions>
                )}
                {media && (
                  <AttachmentTrigger asChild>
                    <a
                      href={media}
                      target='_blank'
                      rel='noreferrer'
                      aria-label={`Abrir ${documentName}`}
                    />
                  </AttachmentTrigger>
                )}
              </Attachment>
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
