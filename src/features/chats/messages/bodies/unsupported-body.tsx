import type { MessageBodyProps } from '../message-kind'
import { unsupportedKind } from '../unsupported-kinds'

/** An honest stand-in: what arrived and its text, never a blank row. */
export function UnsupportedBody({ view }: MessageBodyProps<'unsupported'>) {
  const kind = unsupportedKind(view.originalType)

  return (
    <div className='flex flex-col gap-1'>
      <span className='text-muted-foreground flex items-center gap-1.5 text-xs font-medium'>
        <kind.icon aria-hidden className='size-3.5' />
        {kind.label}
      </span>
      <p className='whitespace-pre-wrap'>
        {view.text ?? (
          <span className='text-muted-foreground italic'>
            Ábrelo en WhatsApp para verlo completo.
          </span>
        )}
      </p>
    </div>
  )
}
