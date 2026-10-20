import { CircleCheck, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { copy } from '../../copy'

/**
 * One-line notice above the field of a resolved conversation. It never blocks
 * the composer (a resolved chat still sends); Reabrir maps to
 * `POST /conversations/:id/reopen` and only shows when the member may do it.
 */
export function ResolvedNotice({
  onReopen,
  className,
}: {
  onReopen?: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'bg-muted/50 mb-2 flex items-center gap-2.5 rounded-xl border px-3 py-2',
        className
      )}
    >
      <CircleCheck
        className='text-muted-foreground size-4 shrink-0'
        aria-hidden
      />
      <p className='min-w-0 flex-1 text-xs'>
        <span className='font-medium'>{copy.resolvedTitle}.</span>{' '}
        <span className='text-muted-foreground'>{copy.resolvedBody}</span>
      </p>
      {onReopen && (
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='h-11 shrink-0 rounded-full px-3.5 text-xs sm:h-7 sm:px-3'
          onClick={onReopen}
        >
          <RotateCcw className='size-3.5' />
          {copy.reopen}
        </Button>
      )}
    </div>
  )
}
