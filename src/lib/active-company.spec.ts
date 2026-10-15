import type { MemberSummary } from '@chat-crm/contracts'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ACTIVE_COMPANY_TAB_KEY,
  LAST_COMPANY_KEY,
  activeMemberships,
  pickActiveCompany,
  rememberActiveCompany,
} from './active-company'

const member = (
  companyId: string,
  status: MemberSummary['status'] = 'active'
): MemberSummary => ({
  id: `member-${companyId}`,
  companyId,
  companyName: `Company ${companyId}`,
  role: 'agent',
  status,
})

describe('active company', () => {
  afterEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('only offers memberships the user can act in', () => {
    expect(
      activeMemberships({
        memberships: [member('x'), member('y', 'inactive'), member('z', 'suspended')],
      }).map((m) => m.companyId)
    ).toEqual(['x'])
    expect(activeMemberships(null)).toEqual([])
  })

  it("prefers this tab's company, then the last used, then the first one", () => {
    const companies = [member('x'), member('y'), member('z')]

    expect(pickActiveCompany(companies)).toBe('x')

    localStorage.setItem(LAST_COMPANY_KEY, 'y')
    expect(pickActiveCompany(companies)).toBe('y')

    sessionStorage.setItem(ACTIVE_COMPANY_TAB_KEY, 'z')
    expect(pickActiveCompany(companies)).toBe('z')
  })

  it('ignores a remembered company the user no longer belongs to', () => {
    sessionStorage.setItem(ACTIVE_COMPANY_TAB_KEY, 'gone')
    localStorage.setItem(LAST_COMPANY_KEY, 'also-gone')

    expect(pickActiveCompany([member('x')])).toBe('x')
    expect(pickActiveCompany([])).toBeNull()
  })

  it('remembers the choice for the tab and as the default for new tabs', () => {
    rememberActiveCompany('y')

    expect(sessionStorage.getItem(ACTIVE_COMPANY_TAB_KEY)).toBe('y')
    expect(localStorage.getItem(LAST_COMPANY_KEY)).toBe('y')
  })

  it('keeps working when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    expect(() => rememberActiveCompany('y')).not.toThrow()
    expect(pickActiveCompany([member('x'), member('y')])).toBe('x')
  })
})
