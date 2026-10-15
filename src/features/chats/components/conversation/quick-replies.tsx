import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/**
 * Static Spanish drafts from prototype Variant F: greeting, sending the quote
 * and requesting the payment receipt. A chip only inserts its draft into the
 * composer; sending stays a separate action. The copy is UI text, so it lives
 * in Spanish per the repo rule.
 */
const QUICK_REPLIES = [
  {
    label: 'Saludo',
    draft: '¡Hola! Gracias por escribirnos. ¿En qué puedo ayudarte?',
  },
  {
    label: 'Cotización',
    draft:
      'Te comparto la cotización solicitada. Quedo atento a cualquier consulta.',
  },
  {
    label: 'Comprobante',
    draft: '¿Podrías enviarnos el comprobante de pago, por favor?',
  },
] as const

/**
 * Compact chips above the composer. They never submit the form (`type` is
 * `button`) and stay visible but disabled while disconnected, matching the
 * composer field and the attachment actions. Touch targets are 44px on phones
 * (ADR-0004) and shrink on wider screens.
 */
export function QuickReplies({
  disabled = false,
  onInsert,
  className,
}: {
  disabled?: boolean
  onInsert: (draft: string) => void
  className?: string
}) {
  return (
    <div
      role='group'
      aria-label='Respuestas rápidas'
      className={cn('flex gap-2 overflow-x-auto pb-2', className)}
    >
      {QUICK_REPLIES.map(({ label, draft }) => (
        <Button
          key={label}
          type='button'
          variant='outline'
          size='sm'
          disabled={disabled}
          title={draft}
          className='h-11 shrink-0 rounded-full px-3.5 text-xs sm:h-8 sm:px-3'
          onClick={() => onInsert(draft)}
        >
          {label}
        </Button>
      ))}
    </div>
  )
}
