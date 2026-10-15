import { X } from 'lucide-react'
import type { ReactNode } from 'react'

type BulkBarProps = {
  count: number
  /** Singular/plural nouns: `['cliente', 'clientes']`. */
  noun: [string, string]
  onClear: () => void
  children: ReactNode
}

/**
 * Appears at the bottom only while rows are selected. The slide answers the
 * selection (it is not decoration) and is skipped under reduced motion.
 */
export function BulkBar({ count, noun, onClear, children }: BulkBarProps) {
  if (count === 0) return null

  return (
    <div
      role='region'
      aria-label='Acciones para la selección'
      className='bg-popover fixed inset-x-4 bottom-6 z-30 mx-auto flex w-fit max-w-full items-center gap-3 rounded-xl border px-3 py-2 shadow-lg motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:fade-in-0'
    >
      <span className='ps-1 text-sm font-medium tabular-nums'>
        {count} {count === 1 ? noun[0] : noun[1]}{' '}
        {count === 1 ? 'seleccionado' : 'seleccionados'}
      </span>
      <span className='bg-border h-5 w-px' aria-hidden />
      <div className='flex items-center gap-1'>{children}</div>
      <button
        type='button'
        onClick={onClear}
        aria-label='Cancelar selección'
        className='text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring rounded-md p-1.5 focus-visible:ring-2 focus-visible:outline-none'
      >
        <X className='size-4' />
      </button>
    </div>
  )
}
