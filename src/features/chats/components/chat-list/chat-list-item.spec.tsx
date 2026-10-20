import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChatsProvider } from '../../contexts/chats.provider'
import { makeChat as baseChat, OTHER } from '../../testing/chats'
import type { Chat } from '../../types/chat.domain'
import { ChatListItem } from './chat-list-item'

const NOW = new Date('2026-10-07T15:00:00').getTime()

const makeChat = (overrides: Partial<Chat> = {}): Chat =>
  baseChat({
    customer: {
      id: 'customer-1',
      displayName: 'María González',
      phone: '+51987654321',
    },
    preview: {
      content: 'tienen stock del modelo X?',
      datetime: new Date(NOW - 2 * 60_000),
    },
    createdAt: new Date(NOW - 60 * 60_000),
    ...overrides,
  })

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <ChatsProvider>{children}</ChatsProvider>
  </QueryClientProvider>
)

const renderItem = (
  chat: Chat,
  options: { waiting?: boolean; showAssignee?: boolean } = {}
) => render(<ChatListItem chat={chat} now={NOW} {...options} />, { wrapper })

describe('ChatListItem', () => {
  it('renders the customer, last message, relative time and channel', () => {
    renderItem(makeChat())

    expect(
      screen.getByRole('button', { name: /María González/ })
    ).toBeInTheDocument()
    expect(screen.getByText('tienen stock del modelo X?')).toBeInTheDocument()
    expect(screen.getByText('2m')).toBeInTheDocument()
    expect(screen.getByText('WhatsApp')).toBeInTheDocument()
  })

  it('flags unassigned chats on the queue views', () => {
    renderItem(makeChat({ assignee: null }), { waiting: true })

    expect(screen.getByText('Sin asignar')).toBeInTheDocument()
  })

  it('shows the status dot only for En espera / Resuelto', () => {
    const { unmount } = renderItem(makeChat())
    expect(screen.queryByText('Abierto')).not.toBeInTheDocument()
    unmount()

    renderItem(makeChat({ status: 'pending' }))
    expect(screen.getByText('En espera')).toBeInTheDocument()
  })

  it('marks transferred chats and counts unread messages', () => {
    renderItem(
      makeChat({
        unread: 3,
        transfer: {
          fromMemberId: 'm-2',
          fromName: 'Luis',
          at: new Date(NOW),
          note: null,
        },
      })
    )

    expect(screen.getByText('Transferido')).toBeInTheDocument()
    expect(screen.getByLabelText('3 sin leer')).toHaveTextContent('3')
  })

  it('shows the owner in the Todos view', () => {
    renderItem(makeChat({ assignee: OTHER }), { showAssignee: true })

    expect(screen.getByText('Luis Quispe')).toBeInTheDocument()
  })

  it('labels attachment previews with their media kind', () => {
    renderItem(
      makeChat({
        preview: {
          content: 'foto.jpg',
          datetime: new Date(NOW - 2 * 60_000),
          type: 'image',
        },
      })
    )

    expect(screen.getByText('Foto:')).toBeInTheDocument()
    expect(screen.getByText('foto.jpg')).toBeInTheDocument()
  })

  it('names the wait on queue rows', () => {
    renderItem(makeChat({ waitingSince: new Date(NOW - 40 * 60_000) }), {
      waiting: true,
    })

    expect(screen.getByText('espera 40m')).toBeInTheDocument()
  })
})
