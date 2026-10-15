import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Clock, Lock, PowerOff } from 'lucide-react'
import type { PlatformStatus } from '@chat-crm/contracts'
import { Field } from '@/components/form-kit'
import { PasswordInput } from '@/components/input-password'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import { classifyUnlockError, unlockPlatform } from '@/services/platform.service'
import { UNLOCK_COPY, rateLimitMessage } from '../copy'
import { PLATFORM_STATUS_KEY } from '../hooks/use-platform-status'

/** 272 seconds -> "4:32". */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.ceil(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = String(safe % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

/** Seconds left until `deadline` (ms epoch), re-evaluated every second. */
function useSecondsLeft(deadline: number | null): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (deadline === null) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [deadline])

  return deadline === null ? 0 : Math.max(0, Math.ceil((deadline - now) / 1000))
}

function Hero({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className='mx-auto flex max-w-sm flex-col gap-6 pt-[8vh]'>
      <span
        aria-hidden
        className='bg-primary/20 text-foreground flex size-12 items-center justify-center rounded-xl'
      >
        {icon}
      </span>
      <div className='space-y-2'>
        <h1 className='text-2xl font-semibold tracking-tight text-balance'>
          {title}
        </h1>
        {children}
      </div>
    </div>
  )
}

/** Console switched off on the server: nothing to type, only how to turn it on. */
export function DisabledScreen() {
  return (
    <Hero icon={<PowerOff className='size-5' />} title={UNLOCK_COPY.disabledTitle}>
      <p className='text-muted-foreground text-sm text-pretty'>
        {UNLOCK_COPY.disabledDescription}
      </p>
      <Button asChild variant='outline' className='mt-4'>
        <Link to='/'>Volver a la app</Link>
      </Button>
    </Hero>
  )
}

/** One password field. Wrong tries explain themselves; a lockout shows its clock. */
export function UnlockScreen({ status }: { status: PlatformStatus }) {
  const queryClient = useQueryClient()
  const [password, setPassword] = useState('')
  const [fieldError, setFieldError] = useState<string>()
  const [deadline, setDeadline] = useState<number | null>(
    status.retryAfterSec ? Date.now() + status.retryAfterSec * 1000 : null
  )
  const secondsLeft = useSecondsLeft(deadline)
  const lockedOut = secondsLeft > 0

  const unlock = useMutation({
    mutationFn: unlockPlatform,
    onSuccess: (next) => {
      setPassword('')
      queryClient.setQueryData(PLATFORM_STATUS_KEY, next)
    },
    onError: (error) => {
      const failure = classifyUnlockError(error)
      switch (failure.kind) {
        case 'rate-limited':
          setFieldError(undefined)
          setDeadline(Date.now() + failure.retryAfterSec * 1000)
          break
        case 'wrong-password':
          setFieldError(UNLOCK_COPY.wrongPassword)
          break
        case 'forbidden':
          setFieldError(UNLOCK_COPY.forbidden)
          break
        case 'disabled':
          // The server turned the console off meanwhile: show that state.
          queryClient.setQueryData<PlatformStatus>(PLATFORM_STATUS_KEY, {
            enabled: false,
            unlocked: false,
          })
          break
        default:
          setFieldError(UNLOCK_COPY.failed)
      }
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (lockedOut || unlock.isPending) return
    if (!password) {
      setFieldError('Escribe la contraseña de la consola.')
      return
    }
    setFieldError(undefined)
    unlock.mutate(password)
  }

  return (
    <Hero icon={<Lock className='size-5' />} title={UNLOCK_COPY.title}>
      <p className='text-muted-foreground text-sm text-pretty'>
        {UNLOCK_COPY.description}
      </p>
      <form noValidate onSubmit={submit} className='mt-6 space-y-4'>
        <Field label={UNLOCK_COPY.password} error={fieldError}>
          <PasswordInput
            autoComplete='off'
            autoFocus
            value={password}
            disabled={lockedOut}
            onChange={(event) => {
              setPassword(event.target.value)
              setFieldError(undefined)
            }}
          />
        </Field>

        {lockedOut ? (
          <div className='bg-muted/60 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm'>
            <Clock aria-hidden className='mt-0.5 size-4 shrink-0' />
            {/* The clock ticks every second: announce the lockout once, not each tick. */}
            <span className='sr-only' role='alert'>
              Demasiados intentos. Espera antes de volver a intentarlo.
            </span>
            <span aria-hidden>{rateLimitMessage(formatCountdown(secondsLeft))}</span>
          </div>
        ) : null}

        <LoadingButton
          type='submit'
          className='w-full'
          loading={unlock.isPending}
          disabled={lockedOut}
        >
          {UNLOCK_COPY.submit}
        </LoadingButton>
      </form>
    </Hero>
  )
}
