import { BUDGET_WARNING_SHARE, type BudgetThreshold } from '@chat-crm/contracts'
import { TriangleAlert } from 'lucide-react'
import { formatPercent, formatUsd } from '../lib/format'

const THRESHOLD_META: Record<
  BudgetThreshold,
  { color: string; label: string | null }
> = {
  none: { color: 'var(--spend)', label: null },
  warning: {
    color: 'var(--sla-risk)',
    label: 'Ya usaste el 80 % del presupuesto',
  },
  exceeded: { color: 'var(--sla-breach)', label: 'Superaste el presupuesto' },
}

type BudgetMeterProps = {
  spentUsd: number
  budgetUsd: number | null
  consumedShare: number | null
  threshold: BudgetThreshold
}

/** Month spend against the budget, with the 80 % warning mark on the track. */
export function BudgetMeter({
  spentUsd,
  budgetUsd,
  consumedShare,
  threshold,
}: BudgetMeterProps) {
  if (budgetUsd === null || consumedShare === null) {
    return (
      <p className='text-muted-foreground text-sm'>
        Sin presupuesto mensual. Define uno para recibir avisos al 80 % y al 100
        %.
      </p>
    )
  }

  const meta = THRESHOLD_META[threshold]

  return (
    <div className='space-y-1.5'>
      <div className='flex items-baseline justify-between gap-3 text-sm'>
        <span>
          <span className='font-semibold tabular-nums'>
            {formatPercent(consumedShare)}
          </span>{' '}
          <span className='text-muted-foreground'>
            de {formatUsd(budgetUsd)}
          </span>
        </span>
        <span className='text-muted-foreground tabular-nums'>
          quedan {formatUsd(Math.max(0, budgetUsd - spentUsd))}
        </span>
      </div>
      <div
        className='bg-muted relative h-2.5 rounded-full'
        role='meter'
        aria-label='Presupuesto consumido'
        aria-valuemin={0}
        aria-valuemax={budgetUsd}
        aria-valuenow={Math.min(spentUsd, budgetUsd)}
      >
        <div
          className='h-full rounded-full'
          style={{
            width: `${Math.min(1, consumedShare) * 100}%`,
            backgroundColor: meta.color,
          }}
        />
        <span
          aria-hidden
          className='bg-foreground/50 absolute -top-1 -bottom-1 w-0.5'
          style={{ left: `${BUDGET_WARNING_SHARE * 100}%` }}
          title='Aviso al 80 %'
        />
      </div>
      {meta.label && (
        <p
          className='flex items-center gap-1.5 text-sm font-medium'
          style={{ color: meta.color }}
        >
          <TriangleAlert className='size-3.5' aria-hidden />
          {meta.label}
        </p>
      )}
    </div>
  )
}
