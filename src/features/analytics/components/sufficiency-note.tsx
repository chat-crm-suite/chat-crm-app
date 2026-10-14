import type { DataSufficiency } from '@chat-crm/contracts'
import { Hourglass } from 'lucide-react'
import { cn } from '@/lib/utils'
import { sufficiencyMessage, type SampleUnit } from '../lib/sufficiency'

type SufficiencyNoteProps = {
  meta: DataSufficiency
  unit: SampleUnit
  /** Completes "para …": `el gráfico de control`. */
  what: string
  className?: string
}

/**
 * Says what is missing instead of drawing a misleading number or chart.
 * Renders nothing when the block has enough data.
 */
export function SufficiencyNote({
  meta,
  unit,
  what,
  className,
}: SufficiencyNoteProps) {
  const message = sufficiencyMessage(meta, unit, what)
  if (!message) return null
  return (
    <p
      className={cn(
        'text-muted-foreground flex items-start gap-2 text-sm',
        className
      )}
    >
      <Hourglass className='mt-0.5 size-3.5 shrink-0' aria-hidden />
      <span>{message}</span>
    </p>
  )
}
