import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FIXTURE_MEMBERS } from '@/features/chats/__fixtures__/conversations'
import {
  FIXTURE_EMPTY_WORK_QUEUE,
  FIXTURE_TASKS,
  FIXTURE_WORK_QUEUE,
} from './__fixtures__/work-queue'
import type { WorkSearch } from './search'
import { WorkScreen } from './work-screen'

// jsdom: Radix Select asks about pointer capture.
Element.prototype.scrollIntoView = vi.fn()
Element.prototype.hasPointerCapture = vi.fn(() => false)
Element.prototype.releasePointerCapture = vi.fn()

const mocks = vi.hoisted(() => ({
  role: {
    role: 'agent',
    memberId: 'm-ana',
    isAdmin: false,
    canSupervise: false,
  },
  listTasks: vi.fn(),
  getWorkQueue: vi.fn(),
  completeTask: vi.fn(),
  updateTask: vi.fn(),
  createTask: vi.fn(),
  searchCompanyMembers: vi.fn(),
  claimChat: vi.fn(),
}))
vi.mock('@/hooks/use-member-role', () => ({ useMemberRole: () => mocks.role }))
vi.mock('@/services/task.service', () => ({
  listTasks: mocks.listTasks,
  getWorkQueue: mocks.getWorkQueue,
  completeTask: mocks.completeTask,
  updateTask: mocks.updateTask,
  createTask: mocks.createTask,
}))
vi.mock('@/services/chat.service', () => ({
  searchCompanyMembers: mocks.searchCompanyMembers,
  claimChat: mocks.claimChat,
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    search,
    ...props
  }: {
    children: ReactNode
    to: string
    search?: Record<string, string>
  }) => (
    <a href={`${to}?${new URLSearchParams(search).toString()}`} {...props}>
      {children}
    </a>
  ),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function renderScreen(search: WorkSearch = {}) {
  const onSearchChange = vi.fn()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  render(<WorkScreen search={search} onSearchChange={onSearchChange} />, {
    wrapper,
  })
  return { onSearchChange, user: userEvent.setup() }
}

describe('WorkScreen (Mi trabajo)', () => {
  beforeEach(() => {
    Object.assign(mocks.role, {
      role: 'agent',
      isAdmin: false,
      canSupervise: false,
    })
    mocks.listTasks
      .mockReset()
      .mockResolvedValue(FIXTURE_TASKS.filter((task) => task.status === 'open'))
    mocks.getWorkQueue.mockReset().mockResolvedValue(FIXTURE_WORK_QUEUE)
    mocks.completeTask.mockReset()
    mocks.searchCompanyMembers.mockReset().mockResolvedValue(FIXTURE_MEMBERS)
    mocks.claimChat.mockReset().mockResolvedValue({})
  })

  it('shows an agent only their own scope, with no Equipo tab', async () => {
    renderScreen({ tab: 'team' })

    expect(
      await screen.findAllByText('Enviar factura con RUC a Rosa')
    ).not.toHaveLength(0)
    expect(
      screen.queryByRole('tab', { name: 'Equipo' })
    ).not.toBeInTheDocument()
    // `tab=team` in the URL is ignored for agents: never `scope=all`.
    expect(mocks.getWorkQueue).toHaveBeenCalledWith({ scope: 'mine' })
    expect(mocks.listTasks).toHaveBeenCalledWith({
      scope: 'mine',
      status: 'open',
    })
  })

  it('lists the live signals with Abrir chat and Tomar on queued chats', async () => {
    const { user } = renderScreen()

    expect(
      await screen.findByText(/Falta responder · hace/)
    ).toBeInTheDocument()
    const links = screen.getAllByRole('link', { name: 'Abrir chat' })
    expect(links[0]).toHaveAttribute('href', '/chats?conversation=conv-pedro')

    await user.click(screen.getByRole('button', { name: 'Tomar' }))
    expect(mocks.claimChat).toHaveBeenCalledWith('conv-pedro')
  })

  it('completes a task from its checkbox', async () => {
    mocks.completeTask.mockResolvedValue({
      ...FIXTURE_TASKS[0],
      status: 'done',
    })
    const { user } = renderScreen()

    const [box] = await screen.findAllByRole('checkbox', {
      name: 'Completar: Enviar factura con RUC a Rosa',
    })
    await user.click(box)
    expect(mocks.completeTask).toHaveBeenCalledWith('task-1')
  })

  it('gives a supervisor the Equipo tab', async () => {
    Object.assign(mocks.role, { role: 'supervisor', canSupervise: true })
    const { user, onSearchChange } = renderScreen()

    await user.click(await screen.findByRole('tab', { name: 'Equipo' }))
    expect(onSearchChange).toHaveBeenCalledWith({
      tab: 'team',
      assignee: undefined,
    })
  })

  it('queries every task and signal on the Equipo tab, narrowed by agent', async () => {
    Object.assign(mocks.role, {
      role: 'admin',
      isAdmin: true,
      canSupervise: true,
    })
    renderScreen({ tab: 'team', assignee: 'm-luis' })

    expect(
      await screen.findByText('Avisos y tareas de todo el equipo.')
    ).toBeInTheDocument()
    expect(mocks.getWorkQueue).toHaveBeenCalledWith({
      scope: 'all',
      assigneeId: 'm-luis',
    })
    expect(mocks.listTasks).toHaveBeenCalledWith({
      scope: 'all',
      assigneeId: 'm-luis',
      status: 'open',
    })
    expect(
      screen.getByRole('combobox', { name: 'Filtrar por agente' })
    ).toBeInTheDocument()
  })

  it('survives an empty company and a failing tasks endpoint independently', async () => {
    mocks.getWorkQueue.mockResolvedValue(FIXTURE_EMPTY_WORK_QUEUE)
    mocks.listTasks.mockRejectedValue(new Error('boom'))
    renderScreen()

    expect(
      await screen.findByText('Todo al día: no hay chats esperando.')
    ).toBeInTheDocument()
    expect(
      await screen.findByText('No se pudieron cargar las tareas.')
    ).toBeInTheDocument()
  })
})
