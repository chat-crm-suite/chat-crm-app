import type { ReactNode } from 'react'

type ContentSectionProps = {
  title: string
  desc: string
  children: ReactNode
}

/**
 * One settings page: a title that says where you are, one sentence on what
 * the page is for, then the forms. The page scrolls with the window (no inner
 * scroller) so the sticky save bar always sticks to the viewport.
 */
export function ContentSection({ title, desc, children }: ContentSectionProps) {
  return (
    <section className='space-y-8'>
      <header className='space-y-1'>
        <h2 className='text-xl font-semibold tracking-tight'>{title}</h2>
        <p className='text-muted-foreground max-w-prose text-sm text-pretty'>
          {desc}
        </p>
      </header>
      {children}
    </section>
  )
}
