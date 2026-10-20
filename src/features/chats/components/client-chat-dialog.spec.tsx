import { useEffect, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CustomerResponseSchema } from '@chat-crm/contracts'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FIXTURE_TEMPLATES } from '@/features/templates/__fixtures__/templates'
import {
  FIXTURE_CHANNELS,
  FIXTURE_CONVERSATIONS,
  FIXTURE_MEMBERS,
} from '../__fixtures__/conversations'
import { useChats } from '../contexts/chats.context'
import { ChatsProvider } from '../contexts/chats.provider'
import { chatKeys } from '../lib/query-keys'
import { makeChat } from '../testing/chats'
import { ClientChatDialog, newChatSteps } from './client-chat-dialog'

// jsdom has no layout: cmdk scrolls options into view, Radix Select asks
// about pointer capture.
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
  searchClient: vi.fn(),
  listChannels: vi.fn(),
  listTemplates: vi.fn(),
  startConversation: vi.fn(),
  searchCompanyMembers: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock('@/hooks/use-member-role', () => ({ useMemberRole: () => mocks.role }))
vi.mock('../api', () => ({
  api: { queries: { clients: { search: mocks.searchClient } } },
}))
vi.mock('@/services/channel.service', () => ({
  listChannels: mocks.listChannels,
}))
vi.mock('@/services/template.service', () => ({
  listTemplates: mocks.listTemplates,
}))
vi.mock('@/services/chat.service', () => ({
  startConversation: mocks.startConversation,
  searchCompanyMembers: mocks.searchCompanyMembers,
}))
vi.mock('sonner', () => ({ toast: mocks.toast }))

const ROSA = CustomerResponseSchema.parse({
  id: 'cus-rosa',
  displayName: 'Rosa Medina',
  phoneNumber: '+51987654321',
  source: 'whatsapp',
  createdAt: new Date(),
  updatedAt: new Date(),
})

const salesChannel = FIXTURE_CHANNELS[0]

function OpenOnMount() {
  const { setSearchClientDialog } = useChats()
  useEffect(() => setSearchClientDialog(true), [setSearchClientDialog])
  return null
}

function renderDialog(seed?: (client: QueryClient) => void) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  seed?.(client)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <ChatsProvider>
        <OpenOnMount />
        {children}
      </ChatsProvider>
    </QueryClientProvider>
  )
  render(<ClientChatDialog />, { wrapper })
  return userEvent.setup()
}

async function pickRosa(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('option', { name: /Rosa Medina/ }))
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
}

describe('newChatSteps', () => {
  it('skips the channel step with one channel and assignment for agents', () => {
    expect(
      newChatSteps({
        channelCount: 1,
        supportsTemplates: true,
        canSupervise: false,
      })
    ).toEqual(['contact', 'template'])
    expect(
      newChatSteps({
        channelCount: 2,
        supportsTemplates: true,
        canSupervise: true,
      })
    ).toEqual(['contact', 'channel', 'template', 'assign'])
  })
})

describe('ClientChatDialog', () => {
  beforeEach(() => {
    Object.assign(mocks.role, {
      role: 'agent',
      isAdmin: false,
      canSupervise: false,
    })
    mocks.searchClient.mockReset().mockResolvedValue([ROSA])
    mocks.listChannels.mockReset().mockResolvedValue([salesChannel])
    mocks.listTemplates
      .mockReset()
      .mockResolvedValue(
        FIXTURE_TEMPLATES.filter(
          (template) =>
            template.channelId === salesChannel.id &&
            template.status === 'approved'
        )
      )
    mocks.startConversation.mockReset().mockResolvedValue({
      conversation: FIXTURE_CONVERSATIONS[0],
      created: true,
      taskId: null,
      messageId: 'msg-1',
    })
    mocks.searchCompanyMembers.mockReset().mockResolvedValue(FIXTURE_MEMBERS)
  })

  it('is in Spanish and starts on the contact step', async () => {
    renderDialog()

    expect(
      await screen.findByRole('heading', { name: 'Nuevo chat' })
    ).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('Buscar por nombre o teléfono…')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
  })

  it('requires a template while the reply window is closed', async () => {
    const user = renderDialog()
    await pickRosa(user)

    expect(
      screen.getByText('La ventana está cerrada: elige una plantilla aprobada.')
    ).toBeInTheDocument()
    const start = screen.getByRole('button', { name: 'Iniciar chat' })
    expect(start).toBeDisabled()

    await user.click(
      await screen.findByRole('radio', { name: /retomar_conversacion/ })
    )
    expect(start).toBeDisabled()
    await user.type(screen.getByLabelText('Nombre del cliente'), 'Rosa')
    expect(start).toBeEnabled()

    await user.click(start)
    expect(mocks.startConversation).toHaveBeenCalledWith({
      customerId: 'cus-rosa',
      channelId: salesChannel.id,
      template: { templateId: 'tpl-retomar', params: { 'body:1': 'Rosa' } },
    })
    expect(mocks.toast.success).toHaveBeenCalledWith('Chat iniciado')
  })

  it('makes the template optional when a listed chat has the window open', async () => {
    const user = renderDialog((client) =>
      client.setQueryData(chatKeys.list('mine'), [
        makeChat({
          customer: { id: 'cus-rosa', displayName: 'Rosa Medina', phone: null },
          channel: {
            id: salesChannel.id,
            type: 'whatsapp',
            name: salesChannel.name,
          },
          windowExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        }),
      ])
    )
    await pickRosa(user)

    expect(
      screen.getByText('La ventana está abierta: la plantilla es opcional.')
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Iniciar chat' }))
    expect(mocks.startConversation).toHaveBeenCalledWith({
      customerId: 'cus-rosa',
      channelId: salesChannel.id,
    })
  })

  it('lets a supervisor assign the chat and create a follow-up task', async () => {
    Object.assign(mocks.role, { role: 'supervisor', canSupervise: true })
    const user = renderDialog((client) =>
      client.setQueryData(chatKeys.list('all'), [
        makeChat({
          customer: { id: 'cus-rosa', displayName: 'Rosa Medina', phone: null },
          channel: {
            id: salesChannel.id,
            type: 'whatsapp',
            name: salesChannel.name,
          },
          windowExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        }),
      ])
    )
    await pickRosa(user)
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByText('Asignar a')).toBeInTheDocument()
    await user.click(screen.getByLabelText('Crear tarea de seguimiento'))
    const start = screen.getByRole('button', { name: 'Iniciar chat' })
    expect(start).toBeDisabled()
    await user.type(
      screen.getByLabelText('Título de la tarea'),
      'Llamar mañana'
    )
    await user.click(start)

    expect(mocks.startConversation).toHaveBeenCalledWith({
      customerId: 'cus-rosa',
      channelId: salesChannel.id,
      task: { title: 'Llamar mañana' },
    })
  })
})
