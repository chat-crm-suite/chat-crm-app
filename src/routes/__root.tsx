import { type QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Toaster } from '@/components/ui/sonner'
import { NavigationProgress } from '@/components/navigation-progress'
import { GeneralError } from '@/features/errors/general-error'
import { NotFoundError } from '@/features/errors/not-found-error'
import { resolveSetupRedirect } from '@/features/setup/setup-steps'
import { getSetupStatus } from '@/services/setup.service'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  beforeLoad: async ({ context, location }) => {
    // Primer arranque: la app decide a dónde ir según si ya está inicializada.
    const status = await context.queryClient.ensureQueryData({
      queryKey: ['setup', 'status'],
      queryFn: getSetupStatus,
      staleTime: 60 * 1000,
    })

    const to = resolveSetupRedirect(status, location.pathname)
    if (to === '/setup') throw redirect({ to: '/setup' })
    if (to === '/sign-in') throw redirect({ to: '/sign-in' })
  },
  component: () => {
    return (
      <>
        <NavigationProgress />
        <Outlet />
        <Toaster duration={5000} />
        {import.meta.env.MODE === 'development' && (
          <>
            <ReactQueryDevtools buttonPosition='bottom-left' />
            <TanStackRouterDevtools position='bottom-right' />
          </>
        )}
      </>
    )
  },
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
})
