import { format } from 'date-fns'
import { X } from 'lucide-react'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * Full-screen viewer for one thread image: a dark, blurred scrim keeps the
 * image as the protagonist while the chrome stays quiet and legible. The
 * shadcn `Dialog` primitive supplies the focus trap, Escape/click-outside
 * dismissal and focus return to the thumbnail.
 *
 * The content spans the whole viewport with `pointer-events-none` so a click
 * on the empty area lands on the overlay (Radix dismisses there); only the
 * interactive pieces re-enable pointer events.
 */
export function ImageLightbox({
  open,
  onOpenChange,
  src,
  alt,
  caption,
  senderName,
  timestamp,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  src: string
  alt: string
  caption?: string
  senderName?: string
  timestamp?: Date
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        overlayClassName='bg-black/85 backdrop-blur-sm'
        className='pointer-events-none flex h-svh w-svw max-w-none flex-col gap-0 rounded-none border-0 bg-transparent p-0 shadow-none sm:max-w-none'
      >
        <DialogTitle className='sr-only'>Vista de imagen</DialogTitle>

        <header className='pointer-events-auto flex items-start justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:py-4 sm:pt-[max(1rem,env(safe-area-inset-top))]'>
          <div className='min-w-0'>
            {senderName && (
              <p className='truncate text-sm font-medium text-white'>
                {senderName}
              </p>
            )}
            {timestamp && (
              <time
                dateTime={timestamp.toISOString()}
                className='block text-xs text-white/60 tabular-nums'
              >
                {format(timestamp, 'HH:mm')}
              </time>
            )}
          </div>
          <DialogClose
            aria-label='Cerrar'
            className='-me-1 flex size-9 shrink-0 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
          >
            <X className='size-5' />
          </DialogClose>
        </header>

        <div className='flex min-h-0 flex-1 items-center justify-center p-3 pt-0 sm:p-5 sm:pt-0'>
          <img
            src={src}
            alt={alt}
            className='pointer-events-auto max-h-full max-w-full rounded-lg object-contain shadow-2xl'
          />
        </div>

        {caption && (
          <p className='pointer-events-auto mx-auto max-w-[65ch] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-sm text-white/80 sm:px-5 sm:py-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]'>
            {caption}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
