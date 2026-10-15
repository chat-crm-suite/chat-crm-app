import { Clock, LayoutTemplate } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/**
 * Shown instead of the quick replies when the channel's free-reply window is
 * closed (WhatsApp: 24 h after the customer's last message). Sending text or
 * files would only bounce at Meta, so the composer is locked and says why;
 * templates are the way back in (#10), shipped visibly disabled meanwhile.
 */
export function ReplyWindowNotice({
  reason,
  className,
}: {
  reason: 'expired' | 'none'
  className?: string
}) {
  return (
    <div
      role='status'
      className={cn(
        'border-chart-2/40 bg-chart-2/10 mb-3 flex items-center gap-2.5 rounded-xl border p-3',
        className
      )}
    >
      <span className='bg-chart-2/15 text-chart-2 flex size-7 shrink-0 items-center justify-center rounded-full'>
        <Clock className='size-4' aria-hidden />
      </span>
      <div className='min-w-0 flex-1 space-y-0.5'>
        <p className='text-sm font-medium'>
          {reason === 'expired' ? 'Ventana de 24 h cerrada' : 'El cliente aún no ha escrito'}
        </p>
        <p className='text-muted-foreground text-xs'>
          {reason === 'expired'
            ? 'Pasaron más de 24 h desde su último mensaje. WhatsApp solo permite plantillas aprobadas hasta que vuelva a escribir.'
            : 'WhatsApp solo permite iniciar la conversación con una plantilla aprobada.'}
        </p>
      </div>
      {/* TODO(#10): open the template picker once the API ships it. */}
      <Button
        type='button'
        variant='outline'
        size='sm'
        className='h-11 shrink-0 rounded-full px-3.5 text-xs sm:h-8 sm:px-3'
        disabled
        title='Próximamente: enviar una plantilla'
        aria-label='Enviar plantilla (próximamente)'
      >
        <LayoutTemplate className='size-3.5' />
        Plantilla
      </Button>
    </div>
  )
}
