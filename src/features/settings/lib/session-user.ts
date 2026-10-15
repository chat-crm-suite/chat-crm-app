import type { QueryClient } from '@tanstack/react-query'
import type { AuthUser } from '@chat-crm/contracts'
import { useAuthStore } from '@/stores/auth-store'
import type { AuthMe } from '@/types/auth.types'

/**
 * Pushes an updated account into the places that render it: the zustand store
 * (sidebar avatar and name) and the `['auth', 'me']` query the route guard
 * reads, so a later navigation does not bring the old values back.
 */
export function syncSessionUser(
  queryClient: QueryClient,
  patch: Partial<AuthUser>
): void {
  const { auth } = useAuthStore.getState()
  if (!auth.user) return

  const user = { ...auth.user, ...patch }
  auth.setUser(user)
  queryClient.setQueryData<AuthMe | undefined>(['auth', 'me'], (previous) =>
    previous ? { ...previous, user } : { user }
  )
}
