import type { ReactNode } from 'react'
import type { TemplateButton } from '@chat-crm/contracts'
import { Copy, ExternalLink, Phone, Reply } from 'lucide-react'
import { cn } from '@/lib/utils'

const BUTTON_ICON = {
  url: ExternalLink,
  phone_number: Phone,
  copy_code: Copy,
  quick_reply: Reply,
  other: Reply,
} as const

/**
 * A template as the customer sees it, channel-agnostic: header (a file or a
 * title), body, footer and buttons. Presentational only: the picker preview
 * fills it with placeholders, the thread with the sent snapshot.
 *
 * - `bubble`: the preview look, a chat bubble over a faint chat backdrop.
 * - `inline`: the thread look, a bordered card that fits the flat rows.
 */
export function TemplateCard({
  media,
  title,
  body,
  footer,
  buttons,
  variant = 'bubble',
  className,
}: {
  /** Header file slot, rendered edge to edge at the top. */
  media?: ReactNode
  /** Text header. */
  title?: ReactNode
  body?: ReactNode
  footer?: ReactNode
  buttons: readonly TemplateButton[]
  variant?: 'bubble' | 'inline'
  className?: string
}) {
  const inline = variant === 'inline'
  const card = (
    <div
      className={cn(
        'bg-card overflow-hidden border',
        inline
          ? 'w-80 max-w-full rounded-xl'
          : 'ms-auto max-w-[85%] rounded-xl rounded-se-sm shadow-xs',
        inline && className
      )}
    >
      {media}
      {(title || body || footer) && (
        <div className='space-y-1.5 px-3 py-2.5 text-sm'>
          {title && <p className='font-semibold'>{title}</p>}
          {body && <p className='whitespace-pre-wrap'>{body}</p>}
          {footer && <p className='text-muted-foreground text-xs'>{footer}</p>}
        </div>
      )}
      {buttons.length > 0 && (
        <div className='divide-y border-t'>
          {buttons.map((button, index) => {
            const Icon = BUTTON_ICON[button.type]
            const content = (
              <>
                <Icon className='size-3.5' aria-hidden />
                {button.text}
              </>
            )
            const style =
              'text-foreground flex items-center justify-center gap-1.5 py-2 text-xs font-medium'
            // In the thread a URL button opens its link; elsewhere it is a label.
            return inline && button.type === 'url' && button.url ? (
              <a
                key={`${button.text}-${index}`}
                href={button.url}
                target='_blank'
                rel='noreferrer'
                className={cn(style, 'hover:bg-accent focus-visible:bg-accent outline-none')}
              >
                {content}
              </a>
            ) : (
              <p key={`${button.text}-${index}`} className={style}>
                {content}
              </p>
            )
          })}
        </div>
      )}
    </div>
  )

  if (inline) return card

  return (
    <div
      className={cn(
        'bg-muted/40 rounded-xl p-4',
        // Faint chat backdrop, theme tokens only.
        '[background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:14px_14px]',
        className
      )}
    >
      {card}
    </div>
  )
}
