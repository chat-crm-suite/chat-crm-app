import type { ReactNode } from 'react'

export type TooltipRow = {
  label: string
  value: string
  /** Series swatch; text always stays in ink colors. */
  color?: string
}

/** Tooltip body shared by the analytics charts (title + labelled values). */
export function ChartTooltipCard({
  title,
  rows,
  footer,
}: {
  title: string
  rows: TooltipRow[]
  footer?: ReactNode
}) {
  return (
    <div className='bg-popover text-popover-foreground grid min-w-36 gap-1 rounded-md border px-2.5 py-1.5 text-xs shadow-md'>
      <p className='text-foreground font-medium'>{title}</p>
      {rows.map((row) => (
        <p key={row.label} className='flex items-center gap-2'>
          {row.color && (
            <span
              aria-hidden
              className='size-2 shrink-0 rounded-[2px]'
              style={{ backgroundColor: row.color }}
            />
          )}
          <span className='text-muted-foreground'>{row.label}</span>
          <span className='text-foreground ms-auto font-medium tabular-nums'>
            {row.value}
          </span>
        </p>
      ))}
      {footer && <div className='text-muted-foreground pt-0.5'>{footer}</div>}
    </div>
  )
}
