import { cn } from '@/lib/utils'

type CapacityMeterProps = {
  open: number
  /** Null = no per-agent limit configured. */
  capacity: number | null
  className?: string
}

/**
 * Open cases against the agent's limit as discrete slots (one per case), so
 * "6 of 8" reads at a glance. Over the limit the filled slots turn red.
 */
export function CapacityMeter({
  open,
  capacity,
  className,
}: CapacityMeterProps) {
  if (capacity === null) {
    return (
      <span className={cn('text-sm tabular-nums', className)}>
        {open} <span className='text-muted-foreground'>sin límite</span>
      </span>
    )
  }

  const over = open > capacity
  const full = open >= capacity
  const slots = Math.min(capacity, 12)
  const filled = Math.round((Math.min(open, capacity) / capacity) * slots)

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className='text-sm tabular-nums'>
        <span className='font-semibold'>{open}</span>
        <span className='text-muted-foreground'> de {capacity}</span>
      </span>
      <span
        className='flex gap-0.5'
        role='meter'
        aria-label='Casos abiertos sobre su capacidad'
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={open}
      >
        {Array.from({ length: slots }, (_, i) => (
          <span
            key={i}
            className={cn(
              'h-3 w-1.5 rounded-[2px]',
              i < filled
                ? full
                  ? over
                    ? 'bg-sla-breach'
                    : 'bg-sla-risk'
                  : 'bg-foreground/70'
                : 'bg-muted'
            )}
          />
        ))}
      </span>
    </span>
  )
}
