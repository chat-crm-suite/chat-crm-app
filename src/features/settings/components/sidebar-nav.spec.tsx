import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { settingsGroups, type CommandContext } from '@/lib/commands'
import { SidebarNav } from './sidebar-nav'

const mocks = vi.hoisted(() => ({ pathname: '/settings' }))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    ...props
  }: { to: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: ({ select }: { select: (l: { pathname: string }) => unknown }) =>
    select({ pathname: mocks.pathname }),
  useNavigate: () => vi.fn(),
}))

const render_ = (context: CommandContext, pathname = '/settings') => {
  mocks.pathname = pathname
  return render(<SidebarNav groups={settingsGroups(context)} />)
}

const nav = () => screen.getByRole('navigation', { name: 'Ajustes' })
const linkNames = () =>
  within(nav())
    .getAllByRole('link')
    .map((link) => link.textContent)

describe('settings nav', () => {
  it('shows every group to an admin', () => {
    render_({ role: 'admin', isPlatformAdmin: false })

    expect(linkNames()).toEqual([
      'Perfil',
      'Seguridad',
      'Notificaciones',
      'Apariencia',
      'Datos de la empresa',
      'Horario y atención',
      'Asignación automática',
      'WhatsApp',
    ])
    expect(within(nav()).getByText('Personal')).toBeVisible()
    expect(within(nav()).getByText('Empresa')).toBeVisible()
    expect(within(nav()).getByText('Integraciones')).toBeVisible()
  })

  it('keeps the company pages visible to supervisors (they open read-only)', () => {
    render_({ role: 'supervisor', isPlatformAdmin: false })
    expect(linkNames()).toContain('Datos de la empresa')
    expect(linkNames()).toContain('Asignación automática')
  })

  it('removes the whole Empresa group for agents', () => {
    render_({ role: 'agent', isPlatformAdmin: false })

    expect(linkNames()).toEqual([
      'Perfil',
      'Seguridad',
      'Notificaciones',
      'Apariencia',
    ])
    expect(within(nav()).queryByText('Empresa')).not.toBeInTheDocument()
    expect(within(nav()).queryByText('Integraciones')).not.toBeInTheDocument()
  })

  it('marks the current page', () => {
    render_({ role: 'admin', isPlatformAdmin: false }, '/settings/security')

    const current = within(nav()).getByRole('link', { current: 'page' })
    expect(current).toHaveTextContent('Seguridad')
    expect(within(nav()).getAllByRole('link', { current: 'page' })).toHaveLength(1)
  })

  it('treats /settings as Perfil only, not as every sub page', () => {
    render_({ role: 'admin', isPlatformAdmin: false }, '/settings')
    expect(within(nav()).getByRole('link', { current: 'page' })).toHaveTextContent(
      'Perfil'
    )
  })

  it('offers the same sections in the small-screen select', () => {
    render_({ role: 'agent', isPlatformAdmin: false }, '/settings/appearance')
    expect(
      screen.getByRole('combobox', { name: 'Sección de ajustes' })
    ).toHaveTextContent('Apariencia')
  })
})
