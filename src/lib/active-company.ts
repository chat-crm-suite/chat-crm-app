import type { AuthUser, MemberSummary } from '@chat-crm/contracts'

/**
 * Active company selection, owned by the client.
 *
 * The session token lists every membership, so switching companies is a
 * local change: the next request simply carries another `x-company-id`. The
 * choice is kept per tab (sessionStorage) so two tabs can work on different
 * companies, and the last one used (localStorage) seeds new tabs.
 */
export const ACTIVE_COMPANY_TAB_KEY = 'chat-crm:active-company'
export const LAST_COMPANY_KEY = 'chat-crm:last-company'

/** Memberships the user can act in right now. */
export function activeMemberships(
  user: Pick<AuthUser, 'memberships'> | null | undefined
): MemberSummary[] {
  return (user?.memberships ?? []).filter((m) => m.status === 'active')
}

function read(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key)
  } catch {
    return null
  }
}

function write(storage: () => Storage, key: string, value: string): void {
  try {
    storage().setItem(key, value)
  } catch {
    // Storage can be unavailable (private mode, blocked site data): the
    // in-memory selection still works for this page load.
  }
}

/**
 * Company to use: this tab's choice, else the last one used, else the first
 * membership. A remembered id is only honored while it is still a membership.
 */
export function pickActiveCompany(companies: MemberSummary[]): string | null {
  const ids = new Set(companies.map((m) => m.companyId))
  const remembered = [
    read(() => sessionStorage, ACTIVE_COMPANY_TAB_KEY),
    read(() => localStorage, LAST_COMPANY_KEY),
  ]

  return (
    remembered.find((id): id is string => !!id && ids.has(id)) ??
    companies[0]?.companyId ??
    null
  )
}

/** Remembers the choice for this tab and as the default for new tabs. */
export function rememberActiveCompany(companyId: string): void {
  write(() => sessionStorage, ACTIVE_COMPANY_TAB_KEY, companyId)
  write(() => localStorage, LAST_COMPANY_KEY, companyId)
}
