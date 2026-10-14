import { Component, type ErrorInfo, type ReactNode } from 'react'
import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { RotateCw, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

type BoundaryProps = {
  onReset: () => void
  title: string
  children: ReactNode
}

type BoundaryState = { error: Error | null }

/**
 * Catches a widget's render or query error (queries throw to it) so one
 * failing widget shows its own retry while the rest of the page keeps going.
 */
class WidgetErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error(
        `[analytics] widget "${this.props.title}" failed`,
        error,
        info
      )
    }
  }

  private retry = () => {
    this.props.onReset()
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div
        role='alert'
        className='text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-2 py-6 text-sm'
      >
        <TriangleAlert
          className='text-sla-breach size-4 shrink-0'
          aria-hidden
        />
        <span>No se pudo cargar «{this.props.title}».</span>
        <Button
          size='sm'
          variant='outline'
          className='h-8'
          onClick={this.retry}
        >
          <RotateCw className='size-3.5' aria-hidden />
          Reintentar
        </Button>
      </div>
    )
  }
}

type WidgetProps = {
  title: string
  /** One plain line saying what the numbers answer. */
  description?: ReactNode
  /** Controls next to the title (filters, actions). */
  actions?: ReactNode
  /** `panel` groups what is read together; `plain` sits on the page. */
  variant?: 'panel' | 'plain'
  className?: string
  children: ReactNode
}

/** Titled, failure-isolated block of the analytics pages. */
export function Widget({
  title,
  description,
  actions,
  variant = 'panel',
  className,
  children,
}: WidgetProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        'min-w-0',
        variant === 'panel' && 'bg-card rounded-lg border p-4 sm:p-5',
        variant === 'plain' && 'border-t pt-4',
        className
      )}
    >
      <header className='mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2'>
        <div className='min-w-0'>
          <h2 className='text-[15px] leading-6 font-semibold'>{title}</h2>
          {description && (
            <p className='text-muted-foreground text-sm'>{description}</p>
          )}
        </div>
        {actions && (
          <div className='flex flex-wrap items-center gap-2'>{actions}</div>
        )}
      </header>
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <WidgetErrorBoundary onReset={reset} title={title}>
            {children}
          </WidgetErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </section>
  )
}

/** Loading placeholder sized like the content it stands for. */
export function WidgetSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className='space-y-2.5' aria-busy='true' aria-label='Cargando'>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className='h-5 w-full' />
      ))}
    </div>
  )
}
