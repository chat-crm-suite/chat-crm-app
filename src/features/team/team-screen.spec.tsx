import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type {
  CreateMemberResult,
  TeamMemberRow,
  TeamTableResponse,
} from '@chat-crm/contracts'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import { compactSearch } from '../workspace/form-utils'
import type { TeamSearch } from './search'
import { TeamScreen } from './team-screen'

// Sheets, menus and tooltips make these flows slow under jsdom.
vi.setConfig({ testTimeout: 20_000 })

const api = vi.hoisted(() => ({
  getTeamTable: vi.fn(),
  createMember: vi.fn(),
  updateMember: vi.fn(),
  removeMember: vi.fn(),
  resetMemberPassword: vi.fn(),
}))
const toasts = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}))

vi.mock('@/services/team.service', () => api)
vi.mock('@/context/socket-provider', () => ({
  useSocket: () => ({ socket: null, isConnected: false }),
}))
vi.mock('sonner', () => ({ toast: toasts }))

const member = (over: Partial<TeamMemberRow>): TeamMemberRow => ({
  id: 'm-ana',
  userId: 'u-ana',
  username: 'ana',
  firstName: 'Ana',
  lastName: 'Pérez',
  email: 'ana@acme.com',
  role: 'agent',
  status: 'active',
  acceptsAutoAssign: true,
  maxOpenConversations: null,
  joinedAt: new Date('2026-01-01'),
  avatarUrl: null,
  phoneNumber: null,
  lastLoginAt: new Date('2026-10-13T10:00:00Z'),
  openConversations: 3,
  capacity: 10,
  presence: { memberId: 'm-ana', state: 'available', since: new Date() },
  ...over,
})

const ROWS = {
  me: member({ id: 'm-me', username: 'sofia', firstName: 'Sofía', lastName: 'Ríos', role: 'supervisor' }),
  admin: member({ id: 'm-boss', username: 'carlos', firstName: 'Carlos', lastName: 'Mena', role: 'admin' }),
  ana: member({}),
  luis: member({ id: 'm-luis', username: 'luis', firstName: 'Luis', lastName: 'Soto', openConversations: 1 }),
}

const page = (items: TeamMemberRow[]): TeamTableResponse => ({
  items,
  meta: {
    totalItems: items.length,
    itemCount: items.length,
    itemsPerPage: 10,
    totalPages: 1,
    currentPage: 1,
    counts: {
      byRole: { admin: 2, supervisor: 1, agent: 2 },
      byPresence: { available: 2, away: 0, offline: 3 },
    },
  },
})

function signIn(role: 'admin' | 'supervisor', memberId: string) {
  useAuthStore.setState((state) => ({
    auth: {
      ...state.auth,
      user: {
        id: 'u-me',
        isPlatformAdmin: false,
        memberships: [{ id: memberId, companyId: 'co-1', role }],
      } as never,
      company: { id: 'co-1' },
    },
  }))
}

function Harness() {
  const [search, setSearch] = useState<TeamSearch>({})
  return (
    <TeamScreen
      search={search}
      onSearchChange={(patch) =>
        setSearch((previous) => compactSearch({ ...previous, ...patch }))
      }
    />
  )
}

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <Harness />
    </QueryClientProvider>
  )
}

const rowOf = async (name: string) =>
  (await screen.findAllByText(name))[0].closest('tr') as HTMLElement

async function openMenu(user: ReturnType<typeof userEvent.setup>, name: string) {
  const row = await rowOf(name)
  await user.click(within(row).getByRole('button', { name: `Acciones de ${name}` }))
}

describe('Equipo table', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signIn('supervisor', 'm-me')
    api.getTeamTable.mockResolvedValue(
      page([ROWS.me, ROWS.admin, ROWS.ana, ROWS.luis])
    )
  })

  it('marks the signed-in member and shows load, presence and role', async () => {
    renderScreen()

    const row = await rowOf('Sofía Ríos')
    expect(within(row).getByText('Tú')).toBeInTheDocument()
    expect(within(row).getByText('@sofia')).toBeInTheDocument()

    const anaRow = await rowOf('Ana Pérez')
    expect(within(anaRow).getByText('Disponible')).toBeInTheDocument()
    expect(
      within(anaRow).getByRole('meter', { name: '3 conversaciones abiertas de 10' })
    ).toBeInTheDocument()
  })

  it('disables what the role forbids and explains why in a tooltip', async () => {
    const user = userEvent.setup()
    renderScreen()

    // A supervisor cannot manage an admin.
    await openMenu(user, 'Carlos Mena')
    const edit = await screen.findByRole('menuitem', { name: 'Editar' })
    expect(edit).toHaveAttribute('aria-disabled', 'true')
    await user.hover(edit)
    expect(
      await screen.findByRole('tooltip', {
        name: 'Solo un administrador puede gestionar a este miembro.',
      })
    ).toBeInTheDocument()

    // Selecting a forbidden item does nothing.
    await user.click(edit)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('disables every action on your own row', async () => {
    const user = userEvent.setup()
    renderScreen()

    await openMenu(user, 'Sofía Ríos')
    for (const name of ['Editar', 'Restablecer contraseña', 'Suspender', 'Eliminar']) {
      expect(await screen.findByRole('menuitem', { name })).toHaveAttribute(
        'aria-disabled',
        'true'
      )
    }
  })

  it('keeps actions on agents enabled for a supervisor', async () => {
    const user = userEvent.setup()
    renderScreen()

    await openMenu(user, 'Ana Pérez')
    expect(await screen.findByRole('menuitem', { name: 'Eliminar' })).not.toHaveAttribute(
      'aria-disabled'
    )
  })

  it('flips the auto-assign switch at once and keeps it when the server agrees', async () => {
    const user = userEvent.setup()
    let resolve!: (row: TeamMemberRow) => void
    api.updateMember.mockReturnValue(new Promise((r) => (resolve = r)))
    renderScreen()

    const toggle = await screen.findByRole('switch', {
      name: 'Asignación automática de Ana Pérez',
    })
    expect(toggle).toBeChecked()
    await user.click(toggle)

    // Optimistic: unchecked before the request settles.
    await waitFor(() => expect(toggle).not.toBeChecked())
    expect(api.updateMember).toHaveBeenCalledWith('m-ana', { acceptsAutoAssign: false })

    resolve({ ...ROWS.ana, acceptsAutoAssign: false })
    await waitFor(() => expect(toggle).not.toBeChecked())
    expect(toasts.error).not.toHaveBeenCalled()
  })

  it('rolls the switch back and tells why when the server refuses', async () => {
    const user = userEvent.setup()
    api.updateMember.mockRejectedValue(
      Object.assign(new AxiosError('forbidden'), {
        response: { status: 403, data: { code: 'team_role' } },
      })
    )
    renderScreen()

    const toggle = await screen.findByRole('switch', {
      name: 'Asignación automática de Ana Pérez',
    })
    await user.click(toggle)

    await waitFor(() => expect(toggle).toBeChecked())
    expect(toasts.error).toHaveBeenCalledWith(
      'No se pudo cambiar la asignación automática de Ana Pérez',
      expect.objectContaining({
        description: 'Solo un administrador puede gestionar a este miembro.',
      })
    )
  })

  it('states how many open conversations return to the queue before deleting', async () => {
    const user = userEvent.setup()
    api.removeMember.mockResolvedValue({ releasedConversations: 3 })
    renderScreen()

    await openMenu(user, 'Ana Pérez')
    await user.click(await screen.findByRole('menuitem', { name: 'Eliminar' }))

    const dialog = await screen.findByRole('alertdialog')
    expect(
      within(dialog).getByText('Sus 3 conversaciones abiertas volverán a la cola sin asignar.')
    ).toBeInTheDocument()

    // The username must be typed before the destructive button works.
    const confirm = within(dialog).getByRole('button', { name: 'Eliminar miembro' })
    expect(confirm).toBeDisabled()
    await user.type(within(dialog).getByLabelText('Escribe ana para confirmar'), 'ana')
    await user.click(confirm)

    await waitFor(() => expect(api.removeMember).toHaveBeenCalledWith('m-ana'))
    expect(toasts.success).toHaveBeenCalledWith(
      'Ana Pérez eliminado. 3 conversaciones volvieron a la cola.'
    )
  })

  it('uses the singular for one open conversation', async () => {
    const user = userEvent.setup()
    renderScreen()

    await openMenu(user, 'Luis Soto')
    await user.click(await screen.findByRole('menuitem', { name: 'Eliminar' }))

    expect(
      await screen.findByText('Su 1 conversación abierta volverá a la cola sin asignar.')
    ).toBeInTheDocument()
  })

  it('quick filters narrow the request by role and presence', async () => {
    const user = userEvent.setup()
    renderScreen()
    await screen.findAllByText('Ana Pérez')

    await user.click(screen.getByRole('button', { name: /^Agentes/ }))
    await waitFor(() =>
      expect(api.getTeamTable).toHaveBeenLastCalledWith(
        expect.objectContaining({ role: ['agent'], page: 1 })
      )
    )

    await user.click(screen.getByRole('button', { name: /^Disponibles/ }))
    await waitFor(() =>
      expect(api.getTeamTable).toHaveBeenLastCalledWith(
        expect.objectContaining({ role: ['agent'], presence: ['available'] })
      )
    )
  })
})

describe('Editar miembro', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signIn('supervisor', 'm-me')
    api.getTeamTable.mockResolvedValue(page([ROWS.me, ROWS.ana]))
  })

  it('sends an empty string when a name is emptied, and only what changed', async () => {
    const user = userEvent.setup()
    api.updateMember.mockResolvedValue({ ...ROWS.ana, lastName: '' })
    renderScreen()

    await user.click((await screen.findAllByText('Ana Pérez'))[0])
    const sheet = await screen.findByRole('dialog', { name: 'Editar miembro' })
    await user.clear(within(sheet).getByLabelText(/Apellido/))
    await user.click(within(sheet).getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(api.updateMember).toHaveBeenCalledWith('m-ana', { lastName: '' })
    )
  })
})

describe('Agregar miembro', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signIn('supervisor', 'm-me')
    api.getTeamTable.mockResolvedValue(page([ROWS.me, ROWS.ana]))
  })

  async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Agregar miembro' }))
    const sheet = await screen.findByRole('dialog')
    await user.type(within(sheet).getByLabelText('Correo'), 'nuevo@acme.com')
    await user.click(within(sheet).getByRole('button', { name: 'Agregar miembro' }))
  }

  const result = (over: Partial<CreateMemberResult>): CreateMemberResult => ({
    member: member({ id: 'm-new', username: 'nuevo', firstName: 'Nuevo', lastName: null }),
    outcome: 'created',
    ...over,
  })

  it('sends only the filled fields and offers supervisors just the agent role', async () => {
    const user = userEvent.setup()
    api.createMember.mockResolvedValue(result({ outcome: 'linked' }))
    renderScreen()

    await user.click(await screen.findByRole('button', { name: 'Agregar miembro' }))
    const sheet = await screen.findByRole('dialog')
    expect(within(sheet).getByRole('combobox', { name: 'Rol' })).toHaveTextContent('Agente')
    expect(within(sheet).getByRole('combobox', { name: 'Rol' })).toBeDisabled()

    await user.type(within(sheet).getByLabelText('Correo'), 'nuevo@acme.com')
    await user.click(within(sheet).getByRole('button', { name: 'Agregar miembro' }))

    await waitFor(() =>
      expect(api.createMember).toHaveBeenCalledWith({
        email: 'nuevo@acme.com',
        role: 'agent',
        acceptsAutoAssign: true,
        maxOpenConversations: null,
      })
    )
  })

  it('created: shows the generated password once, behind a reveal', async () => {
    const user = userEvent.setup()
    api.createMember.mockResolvedValue(
      result({ outcome: 'created', initialPassword: 'abcd1234efgh5678' })
    )
    renderScreen()
    await screen.findAllByText('Ana Pérez')
    await fillAndSubmit(user)

    expect(await screen.findByText('Miembro agregado')).toBeInTheDocument()
    expect(screen.getByText('Contraseña de Nuevo')).toBeInTheDocument()
    // Hidden until asked for, and the sheet cannot be closed unseen.
    expect(screen.queryByText(/abcd 1234 efgh 5678/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Listo, ya la guardé' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Mostrar' }))
    expect(screen.getByText('abcd 1234 efgh 5678')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Listo, ya la guardé' }))
    await waitFor(() => expect(screen.queryByText('Contraseña de Nuevo')).not.toBeInTheDocument())
    expect(screen.queryByText(/abcd 1234/)).not.toBeInTheDocument()
  })

  it('linked: says the account already existed and shows no password', async () => {
    const user = userEvent.setup()
    api.createMember.mockResolvedValue(result({ outcome: 'linked' }))
    renderScreen()
    await screen.findAllByText('Ana Pérez')
    await fillAndSubmit(user)

    expect(await screen.findAllByText('Cuenta existente vinculada')).not.toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Mostrar' })).not.toBeInTheDocument()
    expect(screen.getByText(/no generamos ninguna nueva/)).toBeInTheDocument()
  })

  it('restored: says the member came back', async () => {
    const user = userEvent.setup()
    api.createMember.mockResolvedValue(result({ outcome: 'restored' }))
    renderScreen()
    await screen.findAllByText('Ana Pérez')
    await fillAndSubmit(user)

    expect(await screen.findAllByText('Miembro restaurado')).not.toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Mostrar' })).not.toBeInTheDocument()
  })

  it('maps a 409 code to a message on the field that caused it', async () => {
    const user = userEvent.setup()
    api.createMember.mockRejectedValue(
      Object.assign(new AxiosError('conflict'), {
        response: { status: 409, data: { code: 'member_exists' } },
      })
    )
    renderScreen()
    await screen.findAllByText('Ana Pérez')
    await fillAndSubmit(user)

    expect(await screen.findByText('Esa persona ya es parte del equipo.')).toBeInTheDocument()
  })
})
