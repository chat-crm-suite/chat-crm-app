import { CircleCheck, RotateCcw } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/**
 * Closed-case notice rendered by the composer. It is inline (never an overlay),
 * so the thread keeps scrolling behind it. Reopen maps to the real `open`
 * transition, but the API write path does not exist yet: the action ships
 * visibly disabled with the repo's "Próximamente" hint, the same honest
 * convention as Resolve in the case header.
 */
export function ResolvedNotice({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-muted/50 mb-3 flex items-center gap-2.5 rounded-xl border p-3',
        className
      )}
    >
      <span className='bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full'>
        <CircleCheck className='size-4' aria-hidden />
      </span>
      <div className='min-w-0 flex-1 space-y-0.5'>
        <p className='text-sm font-medium'>Caso resuelto</p>
        <p className='text-muted-foreground text-xs'>
          Este caso está cerrado. Reábrelo para seguir respondiendo.
        </p>
      </div>
      {/* TODO(#11): wire to the open transition when the API endpoint ships. */}
      <Button
        type='button'
        variant='outline'
        size='sm'
        className='h-11 shrink-0 rounded-full px-3.5 text-xs sm:h-8 sm:px-3'
        disabled
        title='Próximamente: reabrir el caso'
        aria-label='Reabrir (próximamente)'
      >
        <RotateCcw className='size-3.5' />
        Reabrir
      </Button>
    </div>
  )
}
