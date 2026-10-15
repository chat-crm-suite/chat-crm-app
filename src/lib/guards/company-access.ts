import { redirect } from '@tanstack/react-router'
import type { MemberRole } from '@chat-crm/contracts'
import { resolveMemberRole } from '@/hooks/use-member-role'
import { useAuthStore } from '@/stores/auth-store'

/**
 * `beforeLoad` helper for pages that only some company roles may open.
 * Everyone else is sent to /403. Call it after the `_authenticated` guard has
 * filled the auth store (child routes run after their parent's `beforeLoad`).
 */
export function requireCompanyRole(allowed: readonly MemberRole[]): void {
  const { auth } = useAuthStore.getState()
  const { role } = resolveMemberRole(auth.user, auth.company.id)

  if (!role || !allowed.includes(role)) {
    throw redirect({ to: '/403' })
  }
}

/** Only platform admins reach the console; everyone else gets /403. */
export function requirePlatformAdmin(): void {
  if (!useAuthStore.getState().auth.user?.isPlatformAdmin) {
    throw redirect({ to: '/403' })
  }
}
