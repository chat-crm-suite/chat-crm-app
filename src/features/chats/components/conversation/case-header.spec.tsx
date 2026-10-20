import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { MemberRole } from '@chat-crm/contracts'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FIXTURE_MEMBERS } from '../../__fixtures__/conversations'
import { caseActionsFor } from '../../lib/conversation-assignment'
import { makeChat, ME, OTHER } from '../../testing/chats'
import type { Chat, ChatSentiment } from '../../types/chat.domain'
import { AssigneePicker } from './assignee-picker'
import { CaseHeader } from './case-header'
import { CaseOptionsMenu } from './case-options-menu'
import { ResolveMenu } from './resolve-menu'

// jsdom has no layout: cmdk scrolls options into view.
Element.prototype.scrollIntoView = vi.fn()

const service = vi.hoisted(() => ({ searchCompanyMembers: vi.fn() }))
vi.mock('@/services/chat.service', () => service)

/**
 * UUID v7 fixture. The header derives the short identifier from it
 * (FNV-1a folded into 1000-9999): `#1371`.
 */
const CONVERSATION_ID = '0199b7f0-2f3a-7c1e-9d4b-6a7c8e9f0a1b'

const sentiment: ChatSentiment = {
  avgPos: 0.52,
  avgNeu: 0.31,
  avgNeg: 0.17,
  totalMessages: 48,
  dominant: 'POS',
}

function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

/** The header as `ChatBox` composes it, for one role. */
function renderHeaderFor(
  role: MemberRole,
  chat: Chat = makeChat({ id: CONVERSATION_ID }),
  extra: { showSentiment?: boolean; onOpenDetails?: () => void } = {}
) {
  const handlers = {
    onTake: vi.fn(),
    onRelease: vi.fn(),
    onAssign: vi.fn(),
    onTransfer: vi.fn(),
    onResolve: vi.fn(),
    onSetPending: vi.fn(),
    onReopen: vi.fn(),
    onCreateTask: vi.fn(),
    onShowHistory: vi.fn(),
    onViewContact: vi.fn(),
    onBack: vi.fn(),
  }
  const actions = caseActionsFor(chat, { role, memberId: ME.memberId })

  render(
    <CaseHeader
      chat={chat}
      sentiment={sentiment}
      showSentiment={extra.showSentiment}
      onBack={handlers.onBack}
      onOpenDetails={extra.onOpenDetails}
      assignee={
        <AssigneePicker
          chat={chat}
          actions={actions}
          onTake={handlers.onTake}
          onRelease={handlers.onRelease}
          onAssign={handlers.onAssign}
          onTransfer={handlers.onTransfer}
        />
      }
      resolveAction={
        <ResolveMenu
          status={chat.status}
          allowed={actions.canChangeStatus}
          onResolve={handlers.onResolve}
          onSetPending={handlers.onSetPending}
          onReopen={handlers.onReopen}
        />
      }
      menu={
        <CaseOptionsMenu
          status={chat.status}
          priority={chat.priority}
          canChangeStatus={actions.canChangeStatus}
          onCreateTask={handlers.onCreateTask}
          onShowHistory={handlers.onShowHistory}
          onViewContact={handlers.onViewContact}
          onResolve={() => handlers.onResolve()}
          onResolveWithNote={vi.fn()}
          onSetPending={handlers.onSetPending}
          onReopen={handlers.onReopen}
          onSetPriority={vi.fn()}
        />
      }
    />,
    { wrapper: Providers }
  )
  return handlers
}

describe('CaseHeader', () => {
  beforeEach(() => {
    localStorage.clear()
    service.searchCompanyMembers.mockReset().mockResolvedValue(FIXTURE_MEMBERS)
  })

  it('shows name, status, channel, phone and the short case id', () => {
    renderHeaderFor(
      'agent',
      makeChat({ id: CONVERSATION_ID, status: 'pending', assignee: ME })
    )

    expect(screen.getByText('Rosa Medina')).toBeInTheDocument()
    expect(screen.getByText('En espera')).toBeInTheDocument()
    expect(screen.getByText('WhatsApp Ventas')).toBeInTheDocument()
    expect(screen.getByText('#1371')).toBeInTheDocument()
    expect(screen.getByText('+51 987 654 321')).toBeInTheDocument()
  })

  describe('sentiment', () => {
    it('hides the tone pill while the IA is unavailable', () => {
      renderHeaderFor('admin', undefined, { showSentiment: false })

      expect(
        screen.queryByRole('button', { name: /tono positivo/i })
      ).not.toBeInTheDocument()
    })

    it('shows the tone pill while the IA is available', () => {
      renderHeaderFor('admin', undefined, { showSentiment: true })

      expect(
        screen.getByRole('button', { name: /tono positivo/i })
      ).toBeInTheDocument()
    })
  })

  describe('as an agent', () => {
    it('only takes a queued chat; status changes are not offered', async () => {
      const user = userEvent.setup()
      const handlers = renderHeaderFor(
        'agent',
        makeChat({ id: CONVERSATION_ID, assignee: null })
      )

      await user.click(screen.getByRole('button', { name: 'Tomar' }))
      expect(handlers.onTake).toHaveBeenCalledTimes(1)
      expect(screen.getByRole('button', { name: /^Resolver/ })).toBeDisabled()
      expect(
        screen.queryByRole('button', { name: /Cambiar|Asignar$/ })
      ).not.toBeInTheDocument()
    })

    it('releases and resolves their own chat', async () => {
      const user = userEvent.setup()
      const handlers = renderHeaderFor(
        'agent',
        makeChat({ id: CONVERSATION_ID, assignee: ME })
      )

      await user.click(
        screen.getByRole('button', { name: 'Asignado a ti. Opciones' })
      )
      await user.click(
        await screen.findByRole('menuitem', { name: 'Liberar a la cola' })
      )
      expect(handlers.onRelease).toHaveBeenCalledTimes(1)

      await user.click(screen.getByRole('button', { name: /^Resolver/ }))
      expect(handlers.onResolve).toHaveBeenCalledTimes(1)
    })

    it('stays read-only on a chat owned by someone else', () => {
      renderHeaderFor(
        'agent',
        makeChat({ id: CONVERSATION_ID, assignee: OTHER })
      )

      expect(screen.getByTitle('Asignado a Luis Quispe')).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Tomar' })
      ).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^Resolver/ })).toBeDisabled()
    })
  })

  describe('as a supervisor', () => {
    it('assigns a queued chat from the picker with presence and workload', async () => {
      const user = userEvent.setup()
      const handlers = renderHeaderFor(
        'supervisor',
        makeChat({ id: CONVERSATION_ID, assignee: null })
      )

      await user.click(
        screen.getByRole('button', { name: 'Sin asignar. Asignar' })
      )
      const luis = await screen.findByRole('option', { name: /Luis Quispe/ })
      expect(within(luis).getByText('8/8 chats')).toBeInTheDocument()
      expect(
        within(luis).getByRole('img', { name: 'Ausente' })
      ).toBeInTheDocument()
      expect(service.searchCompanyMembers).toHaveBeenCalledWith('', {
        withWorkload: true,
      })

      await user.click(luis)
      expect(handlers.onAssign).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'm-luis' })
      )
    })

    it('transfers an owned chat with an internal note', async () => {
      const user = userEvent.setup()
      const handlers = renderHeaderFor(
        'supervisor',
        makeChat({ id: CONVERSATION_ID, assignee: OTHER })
      )

      await user.click(
        screen.getByRole('button', { name: /Responsable: Luis Quispe/ })
      )
      await user.click(
        await screen.findByRole('option', { name: /Sofía Ramos/ })
      )
      await user.type(
        screen.getByLabelText('Nota interna (opcional)'),
        'Cliente VIP'
      )
      await user.click(screen.getByRole('button', { name: 'Transferir' }))

      expect(handlers.onTransfer).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'm-sofia' }),
        'Cliente VIP'
      )
    })

    it('searches members with a debounce', async () => {
      const user = userEvent.setup()
      renderHeaderFor(
        'supervisor',
        makeChat({ id: CONVERSATION_ID, assignee: null })
      )

      await user.click(
        screen.getByRole('button', { name: 'Sin asignar. Asignar' })
      )
      await user.type(screen.getByPlaceholderText('Buscar miembros…'), 'sof')

      await vi.waitFor(() =>
        expect(service.searchCompanyMembers).toHaveBeenLastCalledWith('sof', {
          withWorkload: true,
        })
      )
      // One request for the empty search, one for the settled term.
      expect(service.searchCompanyMembers).toHaveBeenCalledTimes(2)
    })

    it('releases an owned chat to the queue', async () => {
      const user = userEvent.setup()
      const handlers = renderHeaderFor(
        'admin',
        makeChat({ id: CONVERSATION_ID, assignee: OTHER })
      )

      await user.click(
        screen.getByRole('button', { name: /Responsable: Luis Quispe/ })
      )
      await user.click(
        await screen.findByRole('option', { name: 'Liberar a la cola' })
      )
      expect(handlers.onRelease).toHaveBeenCalledTimes(1)
    })
  })

  describe('status actions', () => {
    it('puts an open chat on hold from the split menu', async () => {
      const user = userEvent.setup()
      const handlers = renderHeaderFor('supervisor')

      await user.click(
        screen.getByRole('button', { name: 'Más opciones de estado' })
      )
      await user.click(
        await screen.findByRole('menuitem', { name: 'Poner en espera' })
      )
      expect(handlers.onSetPending).toHaveBeenCalledTimes(1)
    })

    it('offers Reabrir on a resolved chat', async () => {
      const user = userEvent.setup()
      const handlers = renderHeaderFor(
        'supervisor',
        makeChat({ id: CONVERSATION_ID, status: 'closed' })
      )

      await user.click(screen.getByRole('button', { name: 'Reabrir' }))
      expect(handlers.onReopen).toHaveBeenCalledTimes(1)
    })
  })

  it('wires the ⋮ menu: task, history and contact; priority shows as coming', async () => {
    const user = userEvent.setup()
    const handlers = renderHeaderFor(
      'agent',
      makeChat({ id: CONVERSATION_ID, assignee: ME })
    )

    await user.click(screen.getByRole('button', { name: 'Más acciones' }))
    await user.click(
      await screen.findByRole('menuitem', { name: 'Crear tarea' })
    )
    expect(handlers.onCreateTask).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Más acciones' }))
    await user.click(
      await screen.findByRole('menuitem', { name: 'Historial de asignaciones' })
    )
    expect(handlers.onShowHistory).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Más acciones' }))
    await user.click(
      await screen.findByRole('menuitem', { name: 'Ver contacto' })
    )
    expect(handlers.onViewContact).toHaveBeenCalledTimes(1)
  })

  it('keeps the mobile back navigation and the detail trigger wired', async () => {
    const user = userEvent.setup()
    const onOpenDetails = vi.fn()
    const handlers = renderHeaderFor('agent', undefined, { onOpenDetails })

    await user.click(screen.getByRole('button', { name: 'Volver a la lista' }))
    await user.click(screen.getByRole('button', { name: 'Detalle del caso' }))

    expect(handlers.onBack).toHaveBeenCalledTimes(1)
    expect(onOpenDetails).toHaveBeenCalledTimes(1)
  })
})
