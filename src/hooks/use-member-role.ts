import { useMemo } from 'react'
import type { AuthState } from '@/types'
import type { MemberRole } from '@chat-crm/contracts'
import { useAuthStore } from '@/stores/auth-store'

type SessionUser = AuthState['auth']['user']

export type MemberRoleInfo = {
  /** Role in the active company; platform admins always act as `admin`. */
  role: MemberRole | null
  /** `company_members.id` of the active membership. */
  memberId: string | null
  isAdmin: boolean
  /** Supervisors and admins: floor monitoring and reassignment. */
  canSupervise: boolean
}

/**
 * Resolves the role of the active company (v2: the role lives on the
 * membership, not on the user). Without an active company it falls back to
 * the first membership, like the sidebar user card.
 */
export function resolveMemberRole(
  user: SessionUser,
  companyId: string | null | undefined
): MemberRoleInfo {
  const memberships = user?.memberships ?? []
  const active = companyId
    ? memberships.find((m) => m.companyId === companyId)
    : memberships[0]

  const role: MemberRole | null = user?.isPlatformAdmin
    ? 'admin'
    : (active?.role ?? null)

  return {
    role,
    memberId: active?.id ?? null,
    isAdmin: role === 'admin',
    canSupervise: role === 'admin' || role === 'supervisor',
  }
}

/** Role of the signed-in user in the active company. */
export function useMemberRole(): MemberRoleInfo {
  const user = useAuthStore((state) => state.auth.user)
  const companyId = useAuthStore((state) => state.auth.company?.id)

  return useMemo(() => resolveMemberRole(user, companyId), [user, companyId])
}
