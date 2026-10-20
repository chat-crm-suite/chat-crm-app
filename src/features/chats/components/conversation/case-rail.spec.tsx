import { useState, type ComponentProps, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FIXTURE_TASKS } from '@/features/tasks/__fixtures__/work-queue'
import { makeChat, OTHER } from '../../testing/chats'
import type { ChatMessage, ChatSentiment } from '../../types/chat.domain'
import { CaseRail } from './case-rail'
import { ToneControl } from './tone-control'
import { TONE_MODE_STORAGE_KEY } from './tone-mode'

const tasks = vi.hoisted(() => ({
  listTasks: vi.fn(),
  completeTask: vi.fn(),
}))
vi.mock('@/services/task.service', () => tasks)

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60 * 1000)

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'm-1',
    conversationId: 'c-1',
    // 9 h 28 min ago -> 14 h 32 min left of the window.
    timestamp: minutesAgo(9 * 60 + 28),
    status: 'read',
    sender: { id: 'customer-1', type: 'customer' },
    clientMessageId: null,
    msg: { type: 'text', text: 'Hola' },
    ...overrides,
  }
}

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

type RailProps = ComponentProps<typeof CaseRail>

const baseProps = (): RailProps => ({
  chat: makeChat(),
  messages: [makeMessage()],
  sentiment,
  showSentiment: true,
  actions: { canTake: false, isMine: true },
  onTake: vi.fn(),
})

const renderRail = (props: Partial<RailProps> = {}) => {
  const all = { ...baseProps(), ...props }
  render(<CaseRail {...all} />, { wrapper: Providers })
  return all
}

describe('CaseRail', () => {
  beforeEach(() => {
    localStorage.clear()
    tasks.listTasks.mockReset().mockResolvedValue([])
    tasks.completeTask.mockReset()
  })

  it('shows the contact section with display name and phone', () => {
    renderRail()

    const rail = screen.getByRole('complementary', { name: 'Detalle del caso' })
    expect(within(rail).getByText('Detalle')).toBeInTheDocument()
    expect(within(rail).getByText('Rosa Medina')).toBeInTheDocument()
    expect(within(rail).getByText('+51 987 654 321')).toBeInTheDocument()
  })

  it('shows the real status of the case', () => {
    renderRail({ chat: makeChat({ status: 'pending' }) })

    expect(screen.getByText('En espera')).toBeInTheDocument()
  })

  it('shows the priority only when the conversation carries one', () => {
    const { unmount } = render(<CaseRail {...baseProps()} />, {
      wrapper: Providers,
    })
    expect(screen.queryByText('Urgente')).not.toBeInTheDocument()
    unmount()

    renderRail({ chat: makeChat({ priority: 'urgent' }) })
    expect(screen.getByText('Urgente')).toBeInTheDocument()
  })

  it('shows Take for an unassigned conversation and reuses the claim callback', async () => {
    const user = userEvent.setup()
    const { onTake } = renderRail({
      chat: makeChat({ assignee: null }),
      actions: { canTake: true, isMine: false },
    })

    await user.click(screen.getByRole('button', { name: 'Tomar chat' }))

    expect(onTake).toHaveBeenCalledTimes(1)
  })

  it('disables Take while the claim is in flight', () => {
    renderRail({
      chat: makeChat({ assignee: null }),
      actions: { canTake: true, isMine: false },
      taking: true,
    })

    expect(screen.getByRole('button', { name: 'Tomando…' })).toBeDisabled()
  })

  it('marks my own conversation and names another owner', () => {
    const { unmount } = render(<CaseRail {...baseProps()} />, {
      wrapper: Providers,
    })
    expect(screen.getByText('Asignado a ti')).toBeInTheDocument()
    unmount()

    renderRail({
      chat: makeChat({ assignee: OTHER }),
      actions: { canTake: false, isMine: false },
    })
    expect(screen.getByText('Luis Quispe')).toBeInTheDocument()
  })

  it('shows the real channel of the conversation, not a hardcoded one', () => {
    renderRail({
      chat: makeChat({
        channel: {
          id: 'ch-2',
          type: 'whatsapp',
          name: 'WhatsApp Soporte',
          status: 'active',
          statusReason: null,
        },
      }),
    })

    expect(screen.getByText('WhatsApp Soporte')).toBeInTheDocument()
  })

  it('shows who transferred the chat and the note', () => {
    renderRail({
      chat: makeChat({
        transfer: {
          fromMemberId: 'member-2',
          fromName: 'Luis Quispe',
          at: new Date(),
          note: 'Pide factura con RUC',
        },
      }),
    })

    expect(screen.getByText('Luis Quispe')).toBeInTheDocument()
    expect(screen.getByText('Pide factura con RUC')).toBeInTheDocument()
  })

  it('lists the open tasks of the chat and completes one', async () => {
    const user = userEvent.setup()
    tasks.listTasks.mockResolvedValue([FIXTURE_TASKS[0]])
    tasks.completeTask.mockResolvedValue({
      ...FIXTURE_TASKS[0],
      status: 'done',
    })
    renderRail()

    expect(await screen.findByText(FIXTURE_TASKS[0].title)).toBeInTheDocument()
    expect(tasks.listTasks).toHaveBeenCalledWith({
      conversationId: 'c-1',
      status: 'open',
    })

    await user.click(
      screen.getByRole('checkbox', {
        name: `Completar: ${FIXTURE_TASKS[0].title}`,
      })
    )
    expect(tasks.completeTask).toHaveBeenCalledWith(FIXTURE_TASKS[0].id)
  })

  it('opens the task dialog from the tasks section', async () => {
    const user = userEvent.setup()
    const onCreateTask = vi.fn()
    renderRail({ onCreateTask })

    expect(
      await screen.findByText('Sin tareas para este chat.')
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Nueva tarea' }))
    expect(onCreateTask).toHaveBeenCalledTimes(1)
  })

  it('shows the tone panel only while the IA is available', () => {
    const { unmount } = render(<CaseRail {...baseProps()} />, {
      wrapper: Providers,
    })
    expect(screen.getByText('Sentimiento')).toBeInTheDocument()
    expect(screen.getByText('Tono positivo')).toBeInTheDocument()
    unmount()

    renderRail({ showSentiment: false })
    expect(screen.queryByText('Sentimiento')).not.toBeInTheDocument()
    expect(screen.queryByText('Tono positivo')).not.toBeInTheDocument()
  })

  it('hides the tone panel in off mode', () => {
    localStorage.setItem(TONE_MODE_STORAGE_KEY, 'off')
    renderRail()

    expect(screen.queryByText('Sentimiento')).not.toBeInTheDocument()
  })

  it('hides the rail tone panel when the header control switches tone off', async () => {
    const user = userEvent.setup()
    render(
      <>
        <ToneControl sentiment={sentiment} />
        <CaseRail {...baseProps()} />
      </>,
      { wrapper: Providers }
    )

    await user.click(screen.getByRole('button', { name: /tono positivo/i }))
    await user.click(await screen.findByRole('radio', { name: 'Oculto' }))

    expect(screen.queryByText('Sentimiento')).not.toBeInTheDocument()
  })

  it('shows the remaining 24 h window from the last customer message', () => {
    renderRail()

    expect(screen.getByText('14 h 32 min')).toBeInTheDocument()
    expect(
      screen.getByRole('progressbar', { name: 'Ventana de 24 h restante' })
    ).toBeInTheDocument()
  })

  it('prefers the later expiry between the list item and the thread', () => {
    renderRail({
      chat: makeChat({
        windowExpiresAt: new Date(Date.now() + 20 * 60 * 60 * 1000),
      }),
    })

    expect(screen.getByText('20 h 00 min')).toBeInTheDocument()
  })

  it('offers the template picker when the window expired', async () => {
    const user = userEvent.setup()
    const onPickTemplate = vi.fn()
    renderRail({
      messages: [makeMessage({ timestamp: minutesAgo(25 * 60) })],
      onPickTemplate,
    })

    expect(
      screen.getByText('Ventana vencida · usa una plantilla')
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Enviar plantilla' }))
    expect(onPickTemplate).toHaveBeenCalledTimes(1)
  })

  it('flips to the expired copy when the 24 h boundary passes while mounted', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-10-06T12:00:00'))
      renderRail({
        messages: [
          makeMessage({
            // 23 h 59 min ago -> 1 min left, one tick away from the boundary.
            timestamp: new Date(Date.now() - (23 * 60 + 59) * 60 * 1000),
          }),
        ],
      })

      expect(screen.getByText('1 min')).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(2 * 60 * 1000)
      })

      expect(
        screen.getByText('Ventana vencida · usa una plantilla')
      ).toBeInTheDocument()
      expect(screen.queryByText('1 min')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows no window when the customer has not written yet', () => {
    renderRail({
      messages: [makeMessage({ sender: { id: 'member-1', type: 'member' } })],
    })

    expect(screen.getByText('El cliente aún no ha escrito')).toBeInTheDocument()
  })

  it('keeps the sheet unmounted until it is opened', () => {
    renderRail()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the same detail in the inline column and the opened sheet', () => {
    renderRail({ open: true })

    expect(screen.getAllByRole('complementary', { hidden: true })).toHaveLength(
      1
    )
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Rosa Medina')).toBeInTheDocument()
    expect(within(dialog).getByText('Tono positivo')).toBeInTheDocument()
  })

  it('reports the sheet close back to its owner', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderRail({ open: true, onOpenChange })

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
