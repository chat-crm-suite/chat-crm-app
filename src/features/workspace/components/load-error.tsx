import { CloudOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** The table could not load: say what failed and offer the one way forward. */
export function LoadError({
  title,
  onRetry,
}: {
  title: string
  onRetry: () => void
}) {
  return (
    <div
      role='alert'
      className='flex flex-col items-center gap-3 px-6 py-16 text-center'
    >
      <CloudOff aria-hidden className='text-muted-foreground size-6' />
      <div className='space-y-1'>
        <p className='text-sm font-medium'>{title}</p>
        <p className='text-muted-foreground text-sm'>
          Revisa tu conexión e inténtalo de nuevo.
        </p>
      </div>
      <Button variant='outline' size='sm' onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  )
}
