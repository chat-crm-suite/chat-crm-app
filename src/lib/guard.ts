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

  const { setUser, setCompany } = useAuthStore.getState().auth
  setUser(auth.user)
  setCompany(auth.company)
}
