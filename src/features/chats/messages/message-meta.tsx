import { format } from 'date-fns'
import { Check, CheckCheck, CircleAlert, Clock3 } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { ChatMessage } from '../types/chat.domain'

/** Delivery tick of an outgoing message (WhatsApp semantics). */
export function StatusTick({
  status,
  className,
}: {
  status: ChatMessage['status']
  className?: string
}) {
  const tickClassName = cn('shrink-0', className ?? 'size-3.5')
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

/** Time and tick floating over a picture that has no caption. */
export function MediaMetaOverlay({
  message,
  isMine,
}: {
  message: ChatMessage
  isMine: boolean
}) {
  const at = new Date(message.timestamp)

  return (
    <span
      data-slot='message-meta'
      className='bg-foreground/60 text-background pointer-events-none absolute end-2.5 bottom-2.5 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] leading-none tabular-nums select-none'
    >
      <time dateTime={at.toISOString()}>{format(at, 'HH:mm')}</time>
      {isMine && <StatusTick status={message.status} className='size-3' />}
    </span>
  )
}
