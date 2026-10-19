import { useEffect, useState } from 'react'
import { Loader2Icon } from 'lucide-react'
import { isApiUp } from '@/lib/http'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/** How often the API is probed while it does not answer. */
export const SERVER_POLL_INTERVAL_MS = 2_000

type ServerUnavailableProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Called once the API answers again (e.g. re-run the route loaders). */
  onReconnect: () => void
}

/**
 * Shown instead of the 500 page when the API did not answer (still booting
 * after `docker compose up`, restarting after a code change, down). Probes
 * `GET /health` and calls `onReconnect` as soon as it answers.
 */
export function ServerUnavailable({
  className,
  onReconnect,
}: ServerUnavailableProps) {
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const controller = new AbortController()

    const probe = async () => {
      const up = await isApiUp(controller.signal)
      if (!active) return
      if (up) {
        onReconnect()
        return
      }
      setAttempts((count) => count + 1)
      timer = setTimeout(() => void probe(), SERVER_POLL_INTERVAL_MS)
    }
    timer = setTimeout(() => void probe(), SERVER_POLL_INTERVAL_MS)

    return () => {
      active = false
      controller.abort()
      clearTimeout(timer)
    }
  }, [onReconnect])

  return (
    <div className={cn('h-svh w-full', className)}>
      <div
        role='status'
        aria-live='polite'
        className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'
      >
        <Loader2Icon className='text-muted-foreground mb-4 size-10 animate-spin' />
        <span className='font-medium'>Conectando con el servidor…</span>
        <p className='text-muted-foreground text-center'>
          El servidor todavía no responde (puede estar arrancando).
          <br />
          La página se recargará sola en cuanto esté disponible.
        </p>
        {attempts > 0 && (
          <p className='text-muted-foreground text-xs'>
            Intentos: {attempts}
          </p>
        )}
        <div className='mt-6'>
          <Button variant='outline' onClick={onReconnect}>
            Reintentar ahora
          </Button>
        </div>
      </div>
    </div>
  )
}
