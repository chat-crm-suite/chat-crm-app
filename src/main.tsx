import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { AxiosError } from 'axios'
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { handleMutationError } from '@/lib/handle-server-error'
import { onSessionRefreshed } from '@/lib/http'
import { notify } from '@/lib/notify'
import { I18nProvider } from '@/lib/i18n/I18nProvider'
import { SocketProvider } from '@/context/socket-provider'
import { DirectionProvider } from './context/direction-provider'
import { FontProvider } from './context/font-provider'
import { ThemeProvider } from './context/theme-provider'
// Generated Routes
import { routeTree } from './routeTree.gen'
// Styles
import '@fontsource-variable/outfit'
import './styles/index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // eslint-disable-next-line no-console
        if (import.meta.env.DEV) console.log({ failureCount, error })

        if (failureCount >= 0 && import.meta.env.DEV) return false
        if (failureCount > 3 && import.meta.env.PROD) return false

        return !(
          error instanceof AxiosError &&
          [401, 403].includes(error.response?.status ?? 0)
        )
      },
      refetchOnWindowFocus: import.meta.env.PROD,
      staleTime: 10 * 1000, // 10s
    },
  },
  // Fallback error toast for mutations nobody else handles (see
  // `handleMutationError`): runs once per failure, never on top of a
  // screen's own toast.
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) =>
      handleMutationError(error, mutation),
  }),
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof AxiosError) {
        if (error.response?.status === 401) {
          notify.warning('Tu sesión expiró', {
            id: 'session-expired',
            description: 'Vuelve a iniciar sesión para continuar.',
          })
          useAuthStore.getState().auth.reset()
          const redirect = `${router.history.location.href}`
          router.navigate({ to: '/sign-in', search: { redirect } })
        }
        if (error.response?.status === 500) {
          notify.error('El servidor tuvo un problema', { id: 'server-error' })
          router.navigate({ to: '/500' })
        }
        if (error.response?.status === 403) {
          // router.navigate("/forbidden", { replace: true });
        }
      }
    },
  }),
})

// A refreshed session (new memberships) replaces the cached profile, so the
// route guard never re-applies an outdated company list.
onSessionRefreshed((session) => {
  queryClient.setQueryData(['auth', 'me'], session)
})

// Switching the active company is local (no request): drop every cached
// query so lists refetch with the new `x-company-id`.
useAuthStore.subscribe((state, previous) => {
  const next = state.auth.company.id
  const prev = previous.auth.company.id
  if (prev && next && prev !== next) {
    void queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] !== 'auth',
    })
  }
})

// Create a new router instance
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Dev-only: warn (and show a banner) when this build's contracts fingerprint
// drifts from the running backend. Never runs in production.
if (import.meta.env.DEV) {
  void import('./lib/contracts-sync').then((module) =>
    module.checkContractsSync(),
  )
}

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <ThemeProvider>
            <I18nProvider lang='es'>
              <FontProvider>
                <DirectionProvider>
                  <RouterProvider router={router} />
                </DirectionProvider>
              </FontProvider>
            </I18nProvider>
          </ThemeProvider>
        </SocketProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}
