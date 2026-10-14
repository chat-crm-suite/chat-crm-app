import { FileWarning } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import type { MediaSource } from './media-source'

/** Placeholder for a file that is on its way or gone. */
export function MediaPlaceholder({
  source,
  label,
  className,
}: {
  source: Extract<MediaSource, { state: 'loading' | 'unavailable' }>
  label: string
  className?: string
}) {
  if (source.state === 'loading') {
    return (
      <span
        role='status'
        className={cn(
          'bg-muted/50 text-muted-foreground flex min-h-14 w-fit items-center gap-2 rounded-lg px-3 py-2 text-xs',
          className
        )}
      >
        <Spinner className='size-4' />
        Cargando {label.toLowerCase()}…
      </span>
    )
  }

  return (
    <span
      className={cn(
        'text-muted-foreground flex w-fit items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs',
        className
      )}
    >
      <FileWarning aria-hidden className='text-destructive size-4 shrink-0' />
      {label} no disponible
    </span>
  )
}

/**
 * Upload progress over a media preview: a ring that fills as the file goes
 * up, then a spinner while the provider takes it.
 */
export function UploadProgress({ progress }: { progress: number | null }) {
  const percent = progress === null ? null : Math.round(progress * 100)
  const radius = 16
  const circumference = 2 * Math.PI * radius

  return (
    <span
      role='progressbar'
      aria-label='Enviando archivo'
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent ?? undefined}
      className='bg-foreground/45 absolute inset-0 grid place-items-center'
    >
      {percent === null || percent >= 100 ? (
        <Spinner className='text-background size-8' />
      ) : (
        <svg viewBox='0 0 40 40' className='size-11 -rotate-90' aria-hidden>
          <circle
            cx='20'
            cy='20'
            r={radius}
            className='stroke-background/30 fill-none'
            strokeWidth='3'
          />
          <circle
            cx='20'
            cy='20'
            r={radius}
            className='stroke-background fill-none transition-[stroke-dashoffset] duration-200 motion-reduce:transition-none'
            strokeWidth='3'
            strokeLinecap='round'
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - percent / 100)}
          />
        </svg>
      )}
    </span>
  )
}
