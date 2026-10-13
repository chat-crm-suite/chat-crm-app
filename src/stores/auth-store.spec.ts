import type { AuthUser, MemberSummary } from '@chat-crm/contracts'
import { afterEach, describe, expect, it } from 'vitest'
import { ACTIVE_COMPANY_TAB_KEY, LAST_COMPANY_KEY } from '@/lib/active-company'
import { useAuthStore } from './auth-store'

const member = (
  companyId: string,
  status: MemberSummary['status'] = 'active'
): MemberSummary => ({
  id: `member-${companyId}`,
  companyId,
  companyName: `Company ${companyId}`,
  role: 'admin',
  status,
})

const user = (memberships: MemberSummary[]): AuthUser => ({
  id: 'user-1',
  username: 'jeremi',
  isPlatformAdmin: false,
  memberships,
})

const auth = () => useAuthStore.getState().auth

describe('auth store', () => {
  afterEach(() => {
    auth().reset()
    sessionStorage.clear()
    localStorage.clear()
  })

  it('keeps the active memberships as the company list and picks the active one', () => {
    auth().setSession(user([member('x'), member('y'), member('z', 'inactive')]))

    expect(auth().companies.map((m) => m.companyId)).toEqual(['x', 'y'])
    expect(auth().company.id).toBe('x')
    expect(sessionStorage.getItem(ACTIVE_COMPANY_TAB_KEY)).toBe('x')
  })

  it('switches the active company locally and remembers it', () => {
    auth().setSession(user([member('x'), member('y')]))

    auth().setCompany({ id: 'y' })

    expect(auth().company.id).toBe('y')
    expect(localStorage.getItem(LAST_COMPANY_KEY)).toBe('y')
  })

  it('keeps the chosen company across session refreshes while it is still a membership', () => {
    auth().setSession(user([member('x'), member('y')]))
    auth().setCompany({ id: 'y' })

    auth().setSession(user([member('x'), member('y')]))
    expect(auth().company.id).toBe('y')

    // Removed from Y: falls back to a company the user still belongs to.
    auth().setSession(user([member('x'), member('y', 'inactive')]))
    expect(auth().company.id).toBe('x')
  })

  it('has no active company for a user without memberships', () => {
    auth().setSession(user([]))

    expect(auth().companies).toEqual([])
    expect(auth().company.id).toBeNull()
  })

  it('clears the session on reset', () => {
    auth().setSession(user([member('x')]))

    auth().reset()

    expect(auth().user).toBeNull()
    expect(auth().companies).toEqual([])
    expect(auth().company.id).toBeNull()
  })
})
