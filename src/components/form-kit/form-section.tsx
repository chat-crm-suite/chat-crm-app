import type { ReactNode } from 'react'

/**
 * A titled group inside a form. Short fields pair up in two columns from `sm`
 * (`columns={2}`); everything else stays single-column so the eye keeps one
 * path down the form.
 */
export function FormSection({
  title,
  description,
  columns = 1,
  children,
}: {
  title: string
  description?: string
  columns?: 1 | 2
  children: ReactNode
}) {
  return (
    <section className='space-y-4'>
      <header className='space-y-0.5'>
        <h3 className='text-base font-semibold'>{title}</h3>
        {description ? (
          <p className='text-muted-foreground text-[13px]'>{description}</p>
        ) : null}
      </header>
      <div
        className={
          columns === 2 ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4'
        }
      >
        {children}
      </div>
    </section>
  )
}
