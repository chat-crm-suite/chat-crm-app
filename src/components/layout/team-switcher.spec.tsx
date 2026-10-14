import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SidebarProvider } from '@/components/ui/sidebar'
import {
  makeUser,
  membership,
  signIn,
  signOut,
} from '@/features/settings/testing/fixtures'
import { useAuthStore } from '@/stores/auth-store'
import {
  revokedCompanyNotice,
  useCompanyShortcuts,
  useRevokedCompanyNotice,
} from './company-switch'
import { TeamSwitcher } from './team-switcher'

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}))
vi.mock('sonner', () => ({ toast }))

const two = makeUser({
  memberships: [
    membership('c1', 'admin', 'Acme SAC'),
    membership('c2', 'agent', 'Beta Logística'),
  ],
})

function renderSwitcher() {
  return render(
    <SidebarProvider>
      <TeamSwitcher />
    </SidebarProvider>
  )
}

const activeId = () => useAuthStore.getState().auth.company.id

beforeEach(() => {
  vi.clearAllMocks()
  window.sessionStorage.clear()
  window.localStorage.clear()
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
  signOut()
})

describe('TeamSwitcher', () => {
  it('shows the active company with the role in it', () => {
    signIn(two, 'c2')
    renderSwitcher()

    const trigger = screen.getByRole('button', {
      name: /empresa activa: beta logística/i,
    })
    expect(trigger).toHaveTextContent('Agente')
  })

  it('switches company from the menu and confirms it', async () => {
    const user = userEvent.setup()
    signIn(two, 'c1')
    renderSwitcher()

    await user.click(screen.getByRole('button', { name: /cambiar de empresa/i }))
    const options = await screen.findAllByRole('menuitem')
    expect(options).toHaveLength(2)
    expect(options[0]).toHaveTextContent('Administrador')
    expect(options[1]).toHaveTextContent('Beta Logística')
    expect(options[1]).toHaveTextContent('Agente')

    await user.click(options[1])

    expect(activeId()).toBe('c2')
    expect(toast.success).toHaveBeenCalledWith('Ahora trabajas en Beta Logística')
    expect(window.localStorage.getItem('chat-crm:last-company')).toBe('c2')
  })

  it('is not a menu with a single company: it only names it', () => {
    signIn(makeUser({ memberships: [membership('c1', 'admin', 'Acme SAC')] }))
    renderSwitcher()

    expect(screen.getByText('Acme SAC')).toBeVisible()
    expect(
      screen.queryByRole('button', { name: /cambiar de empresa/i })
    ).not.toBeInTheDocument()
  })

  it('renders nothing when there is no active company', () => {
    signIn(makeUser({ memberships: [] }))
    const { container } = renderSwitcher()
    expect(container.querySelector('[data-slot=sidebar-menu]')).toBeNull()
  })
})

describe('company shortcuts', () => {
  const press = (key: string, init: KeyboardEventInit = { ctrlKey: true }) =>
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
      )
    })

  it('switches to the Nth company with Ctrl+N and Cmd+N', () => {
    signIn(two, 'c1')
    renderHook(() => useCompanyShortcuts())

    press('2')
    expect(activeId()).toBe('c2')
    expect(toast.success).toHaveBeenCalledWith('Ahora trabajas en Beta Logística')

    press('1', { metaKey: true })
    expect(activeId()).toBe('c1')
  })

  it('ignores digits without the modifier, unknown positions and extra modifiers', () => {
    signIn(two, 'c1')
    renderHook(() => useCompanyShortcuts())

    press('2', {})
    press('3')
    press('2', { ctrlKey: true, shiftKey: true })
    press('0')

    expect(activeId()).toBe('c1')
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('does nothing with a single company', () => {
    signIn(makeUser({ memberships: [membership('c1')] }))
    renderHook(() => useCompanyShortcuts())

    const event = new KeyboardEvent('keydown', {
      key: '1',
      ctrlKey: true,
      cancelable: true,
    })
    act(() => {
      document.dispatchEvent(event)
    })
    expect(event.defaultPrevented).toBe(false)
  })
})

describe('revoked company fallback', () => {
  const c1 = membership('c1', 'admin', 'Acme SAC')
  const c2 = membership('c2', 'agent', 'Beta Logística')

  it('explains the fallback when the active company is gone', () => {
    expect(
      revokedCompanyNotice(
        { activeId: 'c1', companies: [c1, c2] },
        { activeId: 'c2', companies: [c2] }
      )
    ).toBe('Ya no tienes acceso a Acme SAC. Ahora trabajas en Beta Logística.')
  })

  it('stays silent for a normal switch or an unchanged refresh', () => {
    expect(
      revokedCompanyNotice(
        { activeId: 'c1', companies: [c1, c2] },
        { activeId: 'c2', companies: [c1, c2] }
      )
    ).toBeNull()
    expect(
      revokedCompanyNotice(
        { activeId: 'c1', companies: [c1] },
        { activeId: 'c1', companies: [c1] }
      )
    ).toBeNull()
  })

  it('falls back to the first membership and warns after a membership refresh', () => {
    signIn(two, 'c1')
    renderHook(() => useRevokedCompanyNotice())

    // The session refresh no longer lists Acme: the store re-resolves.
    act(() => {
      useAuthStore
        .getState()
        .auth.setSession({ ...two, memberships: [membership('c2', 'agent', 'Beta Logística')] })
    })

    expect(activeId()).toBe('c2')
    expect(toast.warning).toHaveBeenCalledWith(
      'Ya no tienes acceso a Acme SAC. Ahora trabajas en Beta Logística.'
    )
  })

  it('leaves no active company when every membership is revoked', () => {
    signIn(two, 'c1')
    renderHook(() => useRevokedCompanyNotice())

    act(() => {
      useAuthStore.getState().auth.setSession({ ...two, memberships: [] })
    })

    expect(activeId()).toBeNull()
    expect(toast.warning).not.toHaveBeenCalled()
  })
})
