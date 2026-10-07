import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ChatsProvider } from '../../contexts/chats.provider'
import type { Chat } from '../../types/chat.domain'
import { ChatListItem } from './chat-list-item'

const NOW = new Date('2026-10-07T15:00:00').getTime()

function makeChat(overrides: Partial<Chat> = {}): Chat {
  return {
    id: 'c-1',
    customer: {
      id: 'customer-1',
      displayName: 'María González',
      phone: '+51987654321',
    },
    preview: {
      content: 'tienen stock del modelo X?',
      datetime: new Date(NOW - 2 * 60_000),
    },
    status: 'open',
    createdAt: new Date(NOW - 60 * 60_000),
    ...overrides,
  }
}

const renderItem = (chat: Chat, waiting = false) =>
  render(
    <ChatsProvider>
      <ChatListItem chat={chat} waiting={waiting} now={NOW} />
    </ChatsProvider>
  )

describe('ChatListItem', () => {
  it('renders the customer, last message and relative time', () => {
    renderItem(makeChat())

    expect(
      screen.getByRole('button', { name: /María González/ })
    ).toBeInTheDocument()
    expect(screen.getByText('tienen stock del modelo X?')).toBeInTheDocument()
    expect(screen.getByText('2m')).toBeInTheDocument()
  })

  it('flags unassigned chats', () => {
    renderItem(makeChat({ isUnassigned: true }))

    expect(screen.getByText('Sin asignar')).toBeInTheDocument()
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

    expect(screen.getByText('Imagen:')).toBeInTheDocument()
    expect(screen.getByText('foto.jpg')).toBeInTheDocument()
  })

  it('keeps the attachment kind after a reload (no live type)', () => {
    renderItem(
      makeChat({
        preview: {
          content: 'transferencia.pdf',
          datetime: new Date(NOW - 5 * 60_000),
        },
      })
    )

    expect(screen.getByText('Documento:')).toBeInTheDocument()
    expect(screen.getByText('transferencia.pdf')).toBeInTheDocument()
  })

  it('names the wait on queue rows', () => {
    renderItem(
      makeChat({ waitingSince: new Date(NOW - 40 * 60_000) }),
      true
    )

    expect(screen.getByText('espera 40m')).toBeInTheDocument()
  })
})
