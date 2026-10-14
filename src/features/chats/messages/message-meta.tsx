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

/**
 * Time and tick of a message. `inline` sits at the end of the text like in
 * WhatsApp; `overlay` floats over media without caption.
 */
export function MessageMeta({
  message,
  isMine,
  variant = 'inline',
  className,
}: {
  message: ChatMessage
  isMine: boolean
  variant?: 'inline' | 'overlay'
  className?: string
}) {
  const at = new Date(message.timestamp)

  return (
    <span
      data-slot='message-meta'
      className={cn(
        'pointer-events-none inline-flex shrink-0 items-center gap-1 text-[11px] leading-none tabular-nums select-none',
        variant === 'inline' &&
          'text-muted-foreground relative top-1 float-end ms-3 mt-1.5',
        variant === 'overlay' &&
          'bg-foreground/55 text-background absolute end-2 bottom-2 rounded-full px-1.5 py-1',
        className
      )}
    >
      <time dateTime={at.toISOString()}>{format(at, 'HH:mm')}</time>
      {isMine && <StatusTick status={message.status} className='size-3.5' />}
    </span>
  )
}
