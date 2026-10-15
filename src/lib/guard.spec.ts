import { isRedirect } from '@tanstack/react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import { requireRole } from './guard'

function signIn(role: 'admin' | 'supervisor' | 'agent', isPlatformAdmin = false) {
  useAuthStore.setState((state) => ({
    auth: {
      ...state.auth,
      user: {
        id: 'user-1',
        isPlatformAdmin,
        memberships: [
          { id: 'member-1', companyId: 'company-a', role },
        ],
      } as never,
      company: { id: 'company-a' },
    },
  }))
}

const run = () => requireRole('admin', 'supervisor')()

describe('requireRole', () => {
  beforeEach(() => {
    useAuthStore.setState((state) => ({
      auth: { ...state.auth, user: null, company: { id: null } },
    }))
  })

  it.each(['admin', 'supervisor'] as const)('lets a %s through', (role) => {
    signIn(role)
    expect(run).not.toThrow()
  })

  it('redirects an agent to /403', () => {
    signIn('agent')

    try {
      run()
      expect.unreachable('expected a redirect')
    } catch (error) {
      expect(isRedirect(error)).toBe(true)
      expect((error as { options: { to: string } }).options.to).toBe('/403')
    }
  })

  it('redirects when the session has no role in the active company', () => {
    expect(run).toThrow()
  })

  it('treats a platform admin as admin', () => {
    signIn('agent', true)
    expect(run).not.toThrow()
  })
})
