import { Copy, Download, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { resolveMediaUrl } from '@/lib/media-url'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Bubble, BubbleContent } from '@/components/ui/bubble'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from '@/components/ui/message'
import { MessageBody } from '../../messages/message-body'
import { kindOf } from '../../messages/registry'
import type { ChatMessage } from '../../types/chat.domain'

/** Identity of the message author as resolved by the thread. */
export interface SenderView {
  name: string
  initials: string
  /** The signed-in member: never labelled, like your own WhatsApp bubbles. */
  isSelf?: boolean
}

/** A message added moments ago enters with a short, state-driven animation. */
const RECENT_WINDOW_MS = 1500

/** Text worth copying from a message (its text or caption). */
function copyableText(message: ChatMessage): string | null {
  const { msg } = message
  if (msg.type === 'text') return msg.text
  if ('caption' in msg) return msg.caption
  if (msg.type === 'unsupported') return msg.text
  return null
}

/** The file of a media message, once the API serves it. */
function downloadUrl(message: ChatMessage): string | undefined {
  const { msg } = message
  if (!('media' in msg) || msg.media.status !== 'ready') return undefined
  return resolveMediaUrl(msg.media.url)
}

export function MessageRow({
  message,
  sender,
  showSender = true,
  onRetry,
  className,
}: {
  message: ChatMessage
  sender: SenderView
  /** First message of a run by the same author: name and avatar show once. */
  showSender?: boolean
  onRetry: (message: ChatMessage) => void
  className?: string
}) {
  const outgoing = message.sender.type !== 'customer'
  const isMine = message.sender.type === 'member'
  const isFailed = isMine && message.status === 'failed'
  const isRecent = Date.now() - new Date(message.timestamp).getTime() < RECENT_WINDOW_MS
  const { frame } = kindOf(message.msg)
  const text = copyableText(message)
  const fileUrl = downloadUrl(message)

  const body = (
    <MessageBody
      view={message.msg}
      message={message}
      isMine={isMine}
      senderName={sender.name}
    />
  )

  return (
    <Message
      align={outgoing ? 'end' : 'start'}
      className={cn(
        message.status === 'pending' && 'opacity-90',
        isRecent && 'motion-safe:animate-message-in',
        className
      )}
    >
      {!outgoing && (
        <MessageAvatar className={cn('size-7 bg-transparent', !showSender && 'invisible')}>
          <Avatar className='size-7'>
            <AvatarFallback className='bg-muted text-[10px] font-semibold'>
              {sender.initials}
            </AvatarFallback>
          </Avatar>
        </MessageAvatar>
      )}

      <MessageContent className='gap-1'>
        {showSender && !sender.isSelf && (
          <MessageHeader className={cn(outgoing && 'justify-end')}>
            {sender.name}
          </MessageHeader>
        )}

        <ContextMenu>
          <ContextMenuTrigger asChild>
            {frame === 'bare' ? (
              <div className={cn('w-fit', outgoing && 'self-end')}>{body}</div>
            ) : (
              <Bubble
                variant={outgoing ? 'tinted' : 'muted'}
                align={outgoing ? 'end' : 'start'}
                className='max-w-[min(80%,36rem)]'
              >
                <BubbleContent className={cn(frame === 'media' && 'p-1')}>
                  {body}
                </BubbleContent>
              </Bubble>
            )}
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
          <MessageFooter>
            <span className='text-destructive me-1 text-xs'>No se envió.</span>
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
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  )
}
