import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SearchProvider } from '@/context/search-provider'
import {
  makeUser,
  membership,
  newQueryClient,
  signIn,
  signOut,
} from '@/features/settings/testing/fixtures'
import { useAuthStore } from '@/stores/auth-store'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  setTheme: vi.fn(),
  searchCustomers: vi.fn(),
  getPlatformStatus: vi.fn(),
  lockPlatform: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}))
vi.mock('@/context/theme-provider', () => ({
  useTheme: () => ({ theme: 'light', setTheme: mocks.setTheme }),
}))
vi.mock('@/services/command-search.service', () => ({
  searchCustomers: mocks.searchCustomers,
}))
vi.mock('@/services/platform.service', () => ({
  getPlatformStatus: mocks.getPlatformStatus,
  lockPlatform: mocks.lockPlatform,
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}))

const customer = (id: string, displayName: string) => ({
  id,
  displayName,
  firstName: null,
  lastName: null,
  email: null,
  phoneNumber: '+51999111222',
  avatarUrl: null,
  source: 'whatsapp' as const,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
})

async function openMenu() {
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={newQueryClient()}>
      <SearchProvider>
        <p>app</p>
      </SearchProvider>
    </QueryClientProvider>
  )
  await user.keyboard('{Control>}k{/Control}')
  await screen.findByRole('dialog')
  return user
}

const headings = () =>
  Array.from(document.querySelectorAll('[cmdk-group-heading]')).map(
    (node) => node.textContent
  )

beforeEach(() => {
  vi.clearAllMocks()
  Element.prototype.scrollIntoView = vi.fn()
  mocks.searchCustomers.mockResolvedValue([])
  mocks.getPlatformStatus.mockResolvedValue({ enabled: true, unlocked: false })
  signOut()
})

describe('CommandMenu', () => {
  it('opens with Ctrl+K and groups what an admin can reach', async () => {
    signIn(makeUser())
    await openMenu()

    expect(headings()).toEqual(['Navegación', 'Ajustes', 'Acciones'])
    expect(screen.getByRole('option', { name: 'Equipo' })).toBeVisible()
    expect(
      screen.getByRole('option', { name: 'Datos de la empresa' })
    ).toBeVisible()
    expect(screen.getByRole('option', { name: 'Agregar miembro' })).toBeVisible()
    expect(screen.getByRole('option', { name: 'Nuevo cliente' })).toBeVisible()
    expect(screen.getByRole('option', { name: 'Cambiar tema' })).toBeVisible()
    expect(
      screen.queryByRole('option', { name: 'Bloquear consola' })
    ).not.toBeInTheDocument()
  })

  it('hides team and company entries from agents', async () => {
    signIn(makeUser({ memberships: [membership('c1', 'agent')] }))
    await openMenu()

    expect(
      screen.queryByRole('option', { name: 'Equipo' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('option', { name: 'Agregar miembro' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('option', { name: 'Datos de la empresa' })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Seguridad' })).toBeVisible()
    expect(screen.getByRole('option', { name: 'Clientes' })).toBeVisible()
  })

  it('shows the platform console to platform admins and "Bloquear consola" once unlocked', async () => {
    mocks.getPlatformStatus.mockResolvedValue({ enabled: true, unlocked: true })
    signIn(makeUser({ isPlatformAdmin: true }))
    await openMenu()

    expect(headings()).toContain('Consola de plataforma')
    expect(
      await screen.findByRole('option', { name: 'Bloquear consola' })
    ).toBeVisible()
  })

  it('does not even ask for the platform status when the user is not a platform admin', async () => {
    signIn(makeUser())
    await openMenu()
    expect(mocks.getPlatformStatus).not.toHaveBeenCalled()
    expect(headings()).not.toContain('Consola de plataforma')
  })

  it('locks the console from the menu', async () => {
    mocks.getPlatformStatus.mockResolvedValue({ enabled: true, unlocked: true })
    mocks.lockPlatform.mockResolvedValue({ enabled: true, unlocked: false })
    signIn(makeUser({ isPlatformAdmin: true }))
    const user = await openMenu()

    await user.click(
      await screen.findByRole('option', { name: 'Bloquear consola' })
    )

    await waitFor(() => expect(mocks.lockPlatform).toHaveBeenCalledTimes(1))
  })

  it('navigates to the pages that open an inline form with their search params', async () => {
    signIn(makeUser())
    const user = await openMenu()

    await user.click(screen.getByRole('option', { name: 'Nuevo cliente' }))

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/customers',
      search: { new: true },
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens "Agregar miembro" on the team page', async () => {
    signIn(makeUser({ memberships: [membership('c1', 'supervisor')] }))
    const user = await openMenu()

    await user.click(screen.getByRole('option', { name: 'Agregar miembro' }))

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/team',
      search: { new: true },
    })
  })

  it('filters entries while typing, ignoring accents', async () => {
    signIn(makeUser())
    const user = await openMenu()

    await user.type(screen.getByRole('combobox'), 'contrasena')

    expect(screen.getByRole('option', { name: 'Seguridad' })).toBeVisible()
    expect(
      screen.queryByRole('option', { name: 'Chats' })
    ).not.toBeInTheDocument()
  })

  it('says so when nothing matches', async () => {
    signIn(makeUser())
    const user = await openMenu()

    await user.type(screen.getByRole('combobox'), 'zzzz')

    expect(
      await screen.findByText('No encontramos nada para “zzzz”.')
    ).toBeVisible()
  })

  it('searches customers only after the pause and with at least 2 characters', async () => {
    mocks.searchCustomers.mockResolvedValue([customer('cust-1', 'María Gómez')])
    signIn(makeUser())
    const user = await openMenu()

    await user.type(screen.getByRole('combobox'), 'm')
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(mocks.searchCustomers).not.toHaveBeenCalled()

    await user.type(screen.getByRole('combobox'), 'aria')
    // Typing is faster than the pause: nothing was sent per keystroke.
    expect(mocks.searchCustomers).not.toHaveBeenCalled()

    await waitFor(() => expect(mocks.searchCustomers).toHaveBeenCalledTimes(1))
    expect(mocks.searchCustomers).toHaveBeenCalledWith(
      'maria',
      expect.anything()
    )
    expect(
      await screen.findByRole('option', { name: /María Gómez/ })
    ).toBeVisible()
  })

  it('opens the chosen customer with the customer search param', async () => {
    mocks.searchCustomers.mockResolvedValue([customer('cust-1', 'María Gómez')])
    signIn(makeUser())
    const user = await openMenu()

    await user.type(screen.getByRole('combobox'), 'maria')
    await user.click(await screen.findByRole('option', { name: /María Gómez/ }))

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: '/customers',
      search: { customer: 'cust-1' },
    })
  })

  it('shows a loading row while customers are being searched', async () => {
    let resolve: (value: unknown[]) => void = () => undefined
    mocks.searchCustomers.mockReturnValue(
      new Promise((r) => {
        resolve = r
      })
    )
    signIn(makeUser())
    const user = await openMenu()

    await user.type(screen.getByRole('combobox'), 'maria')

    expect(await screen.findByText('Buscando clientes…')).toBeVisible()
    resolve([customer('cust-1', 'María Gómez')])
    expect(
      await screen.findByRole('option', { name: /María Gómez/ })
    ).toBeVisible()
  })

  it('lets people switch company from the menu', async () => {
    signIn(
      makeUser({
        memberships: [
          membership('c1', 'admin', 'Acme SAC'),
          membership('c2', 'agent', 'Beta Logística'),
        ],
      }),
      'c1'
    )
    const user = await openMenu()

    expect(headings()).toContain('Empresas')
    expect(
      screen.queryByRole('option', { name: /Cambiar a Acme SAC/ })
    ).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('option', { name: /Cambiar a Beta Logística/ })
    )

    expect(useAuthStore.getState().auth.company.id).toBe('c2')
  })

  it('hides the Empresas group with a single company', async () => {
    signIn(makeUser())
    await openMenu()
    expect(headings()).not.toContain('Empresas')
  })

  it('changes the theme through a second step', async () => {
    signIn(makeUser())
    const user = await openMenu()

    await user.click(screen.getByRole('option', { name: 'Cambiar tema' }))
    const list = screen.getByRole('listbox')
    expect(within(list).getByRole('option', { name: /Claro/ })).toBeVisible()

    await user.click(within(list).getByRole('option', { name: /Oscuro/ }))

    expect(mocks.setTheme).toHaveBeenCalledWith('dark')
  })
})
