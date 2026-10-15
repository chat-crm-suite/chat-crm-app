import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { CustomerRow } from '@chat-crm/contracts'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import { compactSearch } from '../workspace/form-utils'
import { CustomersScreen } from './customers-screen'
import type { CustomersSearch } from './search'

// Sheets, menus and popovers make these flows slow under jsdom.
vi.setConfig({ testTimeout: 20_000 })

// jsdom has no layout: cmdk scrolls options into view and Radix Select asks
// about pointer capture.
Element.prototype.scrollIntoView = vi.fn()
Element.prototype.hasPointerCapture = vi.fn(() => false)
Element.prototype.releasePointerCapture = vi.fn()

const api = vi.hoisted(() => ({
  getCustomersTable: vi.fn(),
  getCustomerRow: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn(),
  bulkDeleteCustomers: vi.fn(),
  importCustomers: vi.fn(),
  listTags: vi.fn(),
  createTag: vi.fn(),
  setCustomerTags: vi.fn(),
  listStages: vi.fn(),
  searchCompanyMembers: vi.fn(),
}))
const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))

vi.mock('@/services/customers.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/customers.service')>()),
  ...api,
}))
vi.mock('@/services/chat.service', () => ({
  searchCompanyMembers: api.searchCompanyMembers,
}))
vi.mock('@/context/socket-provider', () => ({
  useSocket: () => ({ socket: null, isConnected: false }),
}))
vi.mock('sonner', () => ({ toast: toasts }))
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  Link: ({
    to,
    search,
    children,
    ...rest
  }: {
    to: string
    search?: Record<string, string>
    children: React.ReactNode
  }) => (
    <a href={`${to}?${new URLSearchParams(search).toString()}`} {...rest}>
      {children}
    </a>
  ),
}))

const customer = (over: Partial<CustomerRow>): CustomerRow => ({
  id: 'c-1',
  firstName: null,
  lastName: null,
  displayName: 'Lucía Fernández',
  email: 'lucia@mail.com',
  phoneNumber: '+51987654321',
  avatarUrl: null,
  source: 'whatsapp',
  pipelineStageId: '00000000-0000-4000-8000-0000000000a1',
  ownerMemberId: '00000000-0000-4000-8000-0000000000b1',
  lastInteractionAt: new Date('2026-10-13T10:00:00Z'),
  createdAt: new Date('2026-09-01'),
  updatedAt: new Date('2026-10-13'),
  owner: { memberId: '00000000-0000-4000-8000-0000000000b1', name: 'Ana Pérez', avatarUrl: null },
  stage: { id: '00000000-0000-4000-8000-0000000000a1', name: 'Negociación', color: '#2a78d6' },
  tags: [
    { id: 't-1', name: 'VIP', color: '#1baf7a' },
    { id: 't-2', name: 'Mayorista', color: null },
    { id: 't-3', name: 'Lima', color: null },
  ],
  conversationsCount: 4,
  openConversation: { id: 'conv-1', status: 'open', assignedMemberId: '00000000-0000-4000-8000-0000000000b1' },
  ...over,
})

const ROWS = [
  customer({}),
  customer({
    id: 'c-2',
    displayName: null,
    phoneNumber: '+51911222333',
    email: null,
    owner: null,
    ownerMemberId: null,
    stage: null,
    tags: [],
    conversationsCount: 0,
    openConversation: null,
    lastInteractionAt: null,
  }),
]
const EXISTING = customer({ id: 'c-9', displayName: 'Ya Existe' })

const page = (items: CustomerRow[]) => ({
  items,
  meta: {
    totalItems: items.length,
    itemCount: items.length,
    itemsPerPage: 10,
    totalPages: 1,
    currentPage: 1,
  },
})

function signIn(role: 'admin' | 'supervisor' | 'agent') {
  useAuthStore.setState((state) => ({
    auth: {
      ...state.auth,
      user: {
        id: 'u-me',
        isPlatformAdmin: false,
        memberships: [{ id: 'm-me', companyId: 'co-1', role }],
      } as never,
      company: { id: 'co-1' },
    },
  }))
}

let lastSearch: CustomersSearch = {}

function Harness({ initial = {} }: { initial?: CustomersSearch }) {
  const [search, setSearch] = useState<CustomersSearch>(initial)
  lastSearch = search
  return (
    <CustomersScreen
      search={search}
      onSearchChange={(patch) =>
        setSearch((previous) => compactSearch({ ...previous, ...patch }))
      }
    />
  )
}

function renderScreen(initial?: CustomersSearch) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <Harness initial={initial} />
    </QueryClientProvider>
  )
}

describe('Clientes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signIn('admin')
    api.getCustomersTable.mockResolvedValue(page(ROWS))
    api.getCustomerRow.mockImplementation(async (id: string) => {
      if (id === EXISTING.id) return EXISTING
      throw Object.assign(new AxiosError('not found'), {
        response: { status: 404, data: {} },
      })
    })
    api.listTags.mockResolvedValue([
      { id: 't-1', name: 'VIP', color: '#1baf7a' },
      { id: 't-2', name: 'Mayorista', color: null },
    ])
    api.listStages.mockResolvedValue([
      { id: '00000000-0000-4000-8000-0000000000a1', name: 'Negociación', position: 1, color: '#2a78d6', isWon: false, isLost: false },
    ])
    api.searchCompanyMembers.mockResolvedValue([
      { id: '00000000-0000-4000-8000-0000000000b1', userId: 'u-1', username: 'ana', firstName: 'Ana', lastName: 'Pérez', role: 'agent', status: 'active', acceptsAutoAssign: true, joinedAt: new Date() },
    ])
  })

  it('shows phone as the name when there is none, overflow tags and the open-conversation link', async () => {
    renderScreen()

    const named = (await screen.findAllByText('Lucía Fernández'))[0].closest('tr')!
    expect(within(named).getByText('VIP')).toBeInTheDocument()
    expect(within(named).getByText('+1')).toBeInTheDocument()
    expect(within(named).getByText('Negociación')).toBeInTheDocument()
    expect(within(named).getByRole('link', { name: 'Abrir la conversación de Lucía Fernández' })).toHaveAttribute(
      'href',
      '/chats?conversation=conv-1'
    )

    const anonymous = screen.getAllByText('+51911222333')[0].closest('tr')!
    expect(within(anonymous).getByText('Sin responsable')).toBeInTheDocument()
    expect(within(anonymous).getByText('Sin contacto')).toBeInTheDocument()
  })

  it('sends "sin responsable" and tags in the table request', async () => {
    const user = userEvent.setup()
    renderScreen()
    await screen.findAllByText('Lucía Fernández')

    expect(api.getCustomersTable).toHaveBeenLastCalledWith({
      page: 1,
      perPage: 10,
      sort: [],
    })

    await user.click(screen.getByRole('button', { name: 'Responsable' }))
    await user.click(await screen.findByRole('option', { name: /Sin responsable/ }))
    await waitFor(() =>
      expect(api.getCustomersTable).toHaveBeenLastCalledWith(
        expect.objectContaining({ ownerMemberId: ['none'], page: 1 })
      )
    )
    await user.keyboard('{Escape}')

    await user.click(screen.getByRole('button', { name: /^Etiquetas/ }))
    await user.click(await screen.findByRole('option', { name: /VIP/ }))
    await waitFor(() =>
      expect(api.getCustomersTable).toHaveBeenLastCalledWith(
        expect.objectContaining({ ownerMemberId: ['none'], tagId: ['t-1'] })
      )
    )

    // Removable chips for what is applied; the sheet flags never reach the API.
    expect(screen.getByRole('button', { name: 'Quitar filtro Responsable: Sin responsable' })).toBeInTheDocument()
    expect(api.getCustomersTable).not.toHaveBeenCalledWith(
      expect.objectContaining({ new: expect.anything() })
    )
  })

  describe('bulk delete', () => {
    it.each(['admin', 'supervisor'] as const)('is available to a %s', async (role) => {
      signIn(role)
      const user = userEvent.setup()
      renderScreen()

      await user.click(await screen.findByRole('checkbox', { name: 'Seleccionar a Lucía Fernández' }))
      const bar = await screen.findByRole('region', { name: 'Acciones para la selección' })
      expect(within(bar).getByText('1 cliente seleccionado')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Importar CSV' })).toBeInTheDocument()

      api.bulkDeleteCustomers.mockResolvedValue({ deleted: 1 })
      await user.click(within(bar).getByRole('button', { name: 'Eliminar' }))
      await user.click(await screen.findByRole('button', { name: 'Eliminar 1 cliente' }))

      await waitFor(() => expect(api.bulkDeleteCustomers).toHaveBeenCalledWith(['c-1']))
      expect(toasts.success).toHaveBeenCalledWith('1 cliente eliminado')
    })

    it('is hidden from agents: no selection, no delete, no import', async () => {
      signIn('agent')
      const user = userEvent.setup()
      renderScreen()
      await screen.findAllByText('Lucía Fernández')

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Importar CSV' })).not.toBeInTheDocument()
      // Agents can still create and edit.
      expect(screen.getByRole('button', { name: 'Nuevo cliente' })).toBeInTheDocument()

      const row = (await screen.findAllByText('Lucía Fernández'))[0].closest('tr')!
      await user.click(within(row).getByRole('button', { name: 'Acciones de Lucía Fernández' }))
      expect(await screen.findByRole('menuitem', { name: 'Editar' })).toBeInTheDocument()
      expect(screen.queryByRole('menuitem', { name: 'Eliminar' })).not.toBeInTheDocument()
    })
  })

  describe('Nuevo cliente', () => {
    async function fillName(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole('button', { name: 'Nuevo cliente' }))
      const sheet = await screen.findByRole('dialog')
      await user.type(within(sheet).getByLabelText(/Nombre para mostrar/), 'Lucía')
      return sheet
    }

    it('opens from the ?new flag', async () => {
      renderScreen({ new: true })
      expect(await screen.findByRole('dialog', { name: 'Nuevo cliente' })).toBeInTheDocument()
    })

    it('asks for something to identify the person before sending', async () => {
      const user = userEvent.setup()
      renderScreen()
      await user.click(await screen.findByRole('button', { name: 'Nuevo cliente' }))
      const sheet = await screen.findByRole('dialog')
      await user.click(within(sheet).getByRole('button', { name: 'Crear cliente' }))

      expect(await within(sheet).findByText('Escribe al menos un teléfono o un nombre.')).toBeInTheDocument()
      expect(api.createCustomer).not.toHaveBeenCalled()
    })

    it('says "Cliente restaurado" and closes when the phone belonged to a deleted customer', async () => {
      const user = userEvent.setup()
      api.createCustomer.mockResolvedValue({ customer: ROWS[0], restored: true })
      renderScreen()
      await screen.findAllByText('Lucía Fernández')

      const sheet = await fillName(user)
      await user.click(within(sheet).getByRole('button', { name: 'Crear cliente' }))

      await waitFor(() => expect(api.createCustomer).toHaveBeenCalledWith({ displayName: 'Lucía' }))
      expect(toasts.success).toHaveBeenCalledWith('Cliente restaurado')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('says "Cliente creado" for a brand new one', async () => {
      const user = userEvent.setup()
      api.createCustomer.mockResolvedValue({ customer: ROWS[0], restored: false })
      renderScreen()
      await screen.findAllByText('Lucía Fernández')

      const sheet = await fillName(user)
      await user.click(within(sheet).getByRole('button', { name: 'Crear cliente' }))

      await waitFor(() => expect(toasts.success).toHaveBeenCalledWith('Cliente creado'))
    })

    it('on 409 shows the conflict with "Ver cliente", which opens that customer', async () => {
      const user = userEvent.setup()
      api.createCustomer.mockRejectedValue(
        Object.assign(new AxiosError('conflict'), {
          response: { status: 409, data: { code: 'customer_exists', customerId: 'c-9' } },
        })
      )
      renderScreen()
      await screen.findAllByText('Lucía Fernández')

      const sheet = await fillName(user)
      await user.click(within(sheet).getByRole('button', { name: 'Crear cliente' }))

      expect(await within(sheet).findByText('Ya existe un cliente con ese teléfono.')).toBeInTheDocument()
      expect(toasts.success).not.toHaveBeenCalled()

      await user.click(within(sheet).getByRole('button', { name: 'Ver cliente' }))
      await waitFor(() => expect(lastSearch.customer).toBe('c-9'))
      expect(await screen.findByRole('dialog', { name: 'Ya Existe' })).toBeInTheDocument()
    })
  })

  it('the edit form sends null for an owner cleared with "Sin responsable"', async () => {
    const user = userEvent.setup()
    api.updateCustomer.mockResolvedValue({ customer: { ...ROWS[0], owner: null }, restored: false })
    renderScreen()

    const row = (await screen.findAllByText('Lucía Fernández'))[0].closest('tr')!
    await user.click(within(row).getByRole('button', { name: 'Acciones de Lucía Fernández' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Editar' }))

    const sheet = await screen.findByRole('dialog', { name: 'Editar cliente' })
    await user.click(within(sheet).getByRole('combobox', { name: /Responsable/ }))
    await user.click(await screen.findByRole('option', { name: 'Sin responsable' }))
    await user.click(within(sheet).getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(api.updateCustomer).toHaveBeenCalledWith('c-1', { ownerMemberId: null })
    )
  })

  describe('detail sheet', () => {
    it('opens from ?customer=<id> even when the customer is not on the loaded page', async () => {
      renderScreen({ customer: 'c-9' })

      const dialog = await screen.findByRole('dialog', { name: 'Ya Existe' })
      expect(within(dialog).getByRole('link', { name: 'Abrir conversación' })).toHaveAttribute(
        'href',
        '/chats?conversation=conv-1'
      )
      expect(api.getCustomerRow).toHaveBeenCalledWith('c-9')
    })

    it('does not look the customer up when it is on the loaded page', async () => {
      renderScreen({ customer: 'c-1' })

      await screen.findByRole('dialog', { name: 'Lucía Fernández' })
      expect(api.getCustomerRow).not.toHaveBeenCalled()
    })

    it('says the customer no longer exists on a 404', async () => {
      renderScreen({ customer: 'gone' })

      const dialog = await screen.findByRole('dialog', { name: 'Este cliente ya no existe.' })
      expect(within(dialog).getByText(/Se eliminó o no pertenece a esta empresa/)).toBeInTheDocument()
      expect(within(dialog).queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    })

    it('clears the owner with null from "Sin responsable"', async () => {
      const user = userEvent.setup()
      api.updateCustomer.mockResolvedValue({ customer: { ...ROWS[0], owner: null, ownerMemberId: null }, restored: false })
      renderScreen({ customer: 'c-1' })

      const dialog = await screen.findByRole('dialog', { name: 'Lucía Fernández' })
      await user.click(within(dialog).getByRole('combobox', { name: 'Responsable' }))
      await user.click(await screen.findByRole('option', { name: 'Sin responsable' }))

      await waitFor(() =>
        expect(api.updateCustomer).toHaveBeenCalledWith('c-1', { ownerMemberId: null })
      )
    })

    it('clears the stage with null from "Sin etapa"', async () => {
      const user = userEvent.setup()
      api.updateCustomer.mockResolvedValue({ customer: { ...ROWS[0], stage: null, pipelineStageId: null }, restored: false })
      renderScreen({ customer: 'c-1' })

      const dialog = await screen.findByRole('dialog', { name: 'Lucía Fernández' })
      await user.click(within(dialog).getByRole('combobox', { name: 'Etapa' }))
      await user.click(await screen.findByRole('option', { name: 'Sin etapa' }))

      await waitFor(() =>
        expect(api.updateCustomer).toHaveBeenCalledWith('c-1', { pipelineStageId: null })
      )
    })

    it('opens on row click and moves the customer to another stage with a PATCH', async () => {
      const user = userEvent.setup()
      api.updateCustomer.mockResolvedValue({ customer: ROWS[0], restored: false })
      api.listStages.mockResolvedValue([
        { id: '00000000-0000-4000-8000-0000000000a1', name: 'Negociación', position: 1, color: null, isWon: false, isLost: false },
        { id: '00000000-0000-4000-8000-0000000000a2', name: 'Cierre', position: 2, color: null, isWon: true, isLost: false },
      ])
      renderScreen()

      await user.click((await screen.findAllByText('Lucía Fernández'))[0])
      const dialog = await screen.findByRole('dialog', { name: 'Lucía Fernández' })
      expect(lastSearch.customer).toBe('c-1')

      await user.click(within(dialog).getByRole('combobox', { name: /Etapa/ }))
      await user.click(await screen.findByRole('option', { name: 'Cierre' }))

      await waitFor(() =>
        expect(api.updateCustomer).toHaveBeenCalledWith('c-1', { pipelineStageId: '00000000-0000-4000-8000-0000000000a2' })
      )
    })

    it('creates a tag when Enter is pressed on a new word and assigns it', async () => {
      const user = userEvent.setup()
      api.createTag.mockResolvedValue({ id: 't-9', name: 'Nuevo', color: null })
      api.setCustomerTags.mockResolvedValue({
        ...ROWS[0],
        tags: [...ROWS[0].tags, { id: 't-9', name: 'Nuevo', color: null }],
      })
      renderScreen({ customer: 'c-1' })

      const dialog = await screen.findByRole('dialog', { name: 'Lucía Fernández' })
      await user.click(within(dialog).getByRole('button', { name: 'Agregar etiqueta' }))
      await user.type(await screen.findByPlaceholderText('Busca o crea una etiqueta'), 'Nuevo{Enter}')

      await waitFor(() => expect(api.createTag).toHaveBeenCalledWith({ name: 'Nuevo' }))
      await waitFor(() =>
        expect(api.setCustomerTags).toHaveBeenCalledWith('c-1', ['t-1', 't-2', 't-3', 't-9'])
      )
    })
  })

  it('reports what the CSV import did', async () => {
    const user = userEvent.setup()
    api.importCustomers.mockResolvedValue({ created: 12, restored: 2, skipped: 1 })
    renderScreen()
    await screen.findAllByText('Lucía Fernández')

    const file = new File(['phone\n+51987654321'], 'clientes.csv', { type: 'text/csv' })
    await user.upload(screen.getByLabelText('Archivo CSV de clientes'), file)

    await waitFor(() => expect(api.importCustomers).toHaveBeenCalledWith(file))
    expect(toasts.success).toHaveBeenCalledWith('12 creados, 2 restaurados, 1 omitidos')
  })
})
