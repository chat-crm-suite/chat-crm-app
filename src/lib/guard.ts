import { redirect } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { session } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth-store'

export async function guard(queryClient: QueryClient, href: string) {
  const auth = await queryClient
    .ensureQueryData({
      queryKey: ['auth', 'me'],
      queryFn: session,
      staleTime: 5 * 60 * 1000,
    })
    .catch(() => null)

  if (!auth?.user) {
    throw redirect({ to: '/sign-in', search: { redirect: href } })
  }

  // Company list + active company come from the session; switching later is
  // local (the next request just carries another `x-company-id`).
  useAuthStore.getState().auth.setSession(auth.user)
}
