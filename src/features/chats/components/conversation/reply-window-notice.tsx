import { Clock, LayoutTemplate } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { copy } from '../../copy'

/**
 * The composer's template-required state: the channel's free-reply window is
 * closed (or never opened), so text and files would only bounce at the
 * provider. The composer shows only this notice; its action opens the
 * template picker, the one way to write again.
 */
export function ReplyWindowNotice({
  reason,
  windowHours = 24,
  onPickTemplate,
  className,
}: {
  reason: 'expired' | 'none'
  windowHours?: number
  /** Absent when the channel has no templates: the notice only explains. */
  onPickTemplate?: () => void
  className?: string
}) {
  return (
    <div
      role='status'
      className={cn(
        'border-warning/40 bg-warning/10 flex items-center gap-3 rounded-xl border p-3',
        'max-sm:flex-col max-sm:items-stretch',
        className
      )}
    >
      <div className='flex min-w-0 flex-1 items-start gap-2.5'>
        <span className='bg-warning/20 text-foreground flex size-7 shrink-0 items-center justify-center rounded-full'>
          <Clock className='size-4' aria-hidden />
        </span>
        <div className='min-w-0 space-y-0.5'>
          <p className='text-sm font-medium'>
            {reason === 'expired'
              ? copy.windowClosedTitle(windowHours)
              : copy.neverWroteTitle}
          </p>
          <p className='text-muted-foreground text-xs'>
            {reason === 'expired' ? copy.windowClosedBody : copy.neverWroteBody}
          </p>
        </div>
      </div>
      {onPickTemplate && (
        <Button
          type='button'
          size='sm'
          className='h-11 shrink-0 rounded-full px-4 text-xs sm:h-8 sm:px-3'
          onClick={onPickTemplate}
        >
          <LayoutTemplate className='size-3.5' />
          {copy.pickTemplate}
        </Button>
      )}
    </div>
  )
}
