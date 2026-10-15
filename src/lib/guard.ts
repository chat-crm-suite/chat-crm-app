import { redirect } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import type { MemberRole } from '@chat-crm/contracts'
import { resolveMemberRole } from '@/hooks/use-member-role'
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

/**
 * `beforeLoad` helper for role-gated routes: anyone whose role in the active
 * company is not listed goes to `/403`. It reads the role from the session the
 * parent `/_authenticated` guard already stored (platform admins act as
 * `admin`), so it never fetches anything itself.
 *
 *   beforeLoad: requireRole('admin', 'supervisor')
 */
export function requireRole(...roles: MemberRole[]) {
  return () => {
    const { user, company } = useAuthStore.getState().auth
    const { role } = resolveMemberRole(user, company.id)

    if (!role || !roles.includes(role)) {
      throw redirect({ to: '/403' })
    }
  }
}
