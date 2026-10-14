import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, Outlet } from '@tanstack/react-router'
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { SearchProvider } from '@/context/search-provider'
import { useAuthStore } from '@/stores/auth-store'
import { userDisplayName } from '@/components/layout/copy'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { lockPlatform } from '@/services/platform.service'
import { PLATFORM_COPY } from '../copy'
import { usePlatformLockSync } from '../hooks/use-platform-lock-sync'
import {
  PLATFORM_STATUS_KEY,
  usePlatformStatus,
} from '../hooks/use-platform-status'

/**
 * The console lives outside the company sidebar: it is not "a page of a
 * company", it is the place where companies are made. The top bar says where
 * you are and always offers the way back.
 */
export function PlatformLayout() {
  usePlatformLockSync()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.auth.user)
  const status = usePlatformStatus()

  const lock = useMutation({
    mutationFn: lockPlatform,
    onSuccess: (next) => {
      queryClient.setQueryData(PLATFORM_STATUS_KEY, next)
      toast.success(PLATFORM_COPY.locked)
    },
    onError: () => toast.error(PLATFORM_COPY.lockFailed),
  })

  return (
    <SearchProvider>
      <div className='bg-background min-h-svh'>
        <header className='bg-background/95 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 sm:px-6'>
          <span
            aria-hidden
            className='bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg'
          >
            <ShieldCheck className='size-4' />
          </span>
          <p className='min-w-0 truncate text-sm font-semibold'>
            {PLATFORM_COPY.consoleName}
          </p>

          <div className='ms-auto flex items-center gap-2'>
            <Search placeholder='Buscar' className='hidden sm:flex sm:w-40 md:w-52' />
            {user ? (
              <span className='text-muted-foreground hidden max-w-40 truncate text-sm lg:inline'>
                {userDisplayName(user)}
              </span>
            ) : null}
            <ThemeSwitch />
            {status.data?.unlocked ? (
              <Button
                variant='outline'
                size='sm'
                disabled={lock.isPending}
                onClick={() => lock.mutate()}
              >
                <Lock className='size-4' />
                <span className='hidden sm:inline'>{PLATFORM_COPY.lock}</span>
                <span className='sr-only sm:hidden'>
                  {PLATFORM_COPY.lock} consola
                </span>
              </Button>
            ) : null}
            <Button asChild variant='outline' size='sm'>
              <Link to='/'>
                <ArrowLeft className='size-4' />
                <span className='hidden sm:inline'>
                  {PLATFORM_COPY.backToApp}
                </span>
                <span className='sr-only sm:hidden'>
                  {PLATFORM_COPY.backToApp}
                </span>
              </Link>
            </Button>
          </div>
        </header>

        <main id='content' className='mx-auto w-full max-w-6xl px-4 py-8 sm:px-6'>
          <Outlet />
        </main>
      </div>
    </SearchProvider>
  )
}
