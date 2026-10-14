import type { AuthUser, MemberRole, MemberSummary } from '@chat-crm/contracts'
import { QueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'

/** Membership of the test user in company `id` (name defaults to "Empresa id"). */
export function membership(
  id: string,
  role: MemberRole = 'admin',
  companyName = `Empresa ${id}`
): MemberSummary {
  return {
    id: `member-${id}`,
    companyId: id,
    companyName,
    role,
    status: 'active',
  }
}

export function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-1',
    username: 'ana',
    firstName: 'Ana',
    lastName: 'Quispe',
    avatarUrl: null,
    email: 'ana@acme.test',
    phoneNumber: '+51987654321',
    isPlatformAdmin: false,
    memberships: [membership('c1')],
    ...overrides,
  }
}

/** Puts a signed-in session in the zustand store, as the route guard would. */
export function signIn(user: AuthUser, activeCompanyId?: string): void {
  const { auth } = useAuthStore.getState()
  const companies = user.memberships.filter((m) => m.status === 'active')
  useAuthStore.setState({
    auth: {
      ...auth,
      user,
      companies,
      company: { id: activeCompanyId ?? companies[0]?.companyId ?? null },
    },
  })
}

export function signOut(): void {
  useAuthStore.getState().auth.reset()
}

export function newQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}
