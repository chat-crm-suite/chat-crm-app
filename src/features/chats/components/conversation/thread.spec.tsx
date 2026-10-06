import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'

import type { ChatMessage } from '../../types/chat.domain'
import { ConversationThread } from './thread'

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'm-1',
    conversationId: 'c-1',
    timestamp: new Date('2026-10-06T09:12:00'),
    status: 'read',
    sender: { id: 'customer-1', type: 'customer' },
    msg: { type: 'text', mediaUrl: null, content: { body: 'Hola' } },
    ...overrides,
  }
}

const renderThread = (
  props: Partial<ComponentProps<typeof ConversationThread>> = {}
) =>
  render(
    <ConversationThread
      messages={[]}
      customerName='Rosa Medina'
      onRetry={vi.fn()}
      {...props}
    />
  )

describe('ConversationThread', () => {
  it('guides the user when the conversation has no messages', () => {
    renderThread()

    expect(screen.getByText('Aún no hay mensajes')).toBeInTheDocument()
    expect(screen.getByText(/Rosa Medina/)).toBeInTheDocument()
  })

  it('shows skeletons while the history loads', () => {
    renderThread({ loading: true })

    const viewport = screen.getByLabelText('Conversación')
    const content = viewport.querySelector(
      '[data-slot="message-scroller-content"]'
    )

    expect(content).toHaveAttribute('aria-busy', 'true')
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
    expect(screen.queryByText('Aún no hay mensajes')).not.toBeInTheDocument()
  })

  it('resolves sender names and only ticks outbound messages', () => {
    renderThread({
      messages: [
        makeMessage({ id: 'm-1' }),
        makeMessage({
          id: 'm-2',
          sender: { id: 'member-1', type: 'member' },
        }),
        makeMessage({
          id: 'm-3',
          sender: { id: 'member-2', type: 'member' },
        }),
        makeMessage({
          id: 'm-4',
          sender: { id: 'system', type: 'system' },
        }),
      ],
      currentMemberId: 'member-1',
      currentMemberName: 'Aron Chancan',
    })

    expect(screen.getByText('Rosa Medina')).toBeInTheDocument()
    expect(screen.getByText('Tú')).toBeInTheDocument()
    expect(screen.getByText('Agente')).toBeInTheDocument()
    expect(screen.getByText('Sistema')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Leído')).toHaveLength(2)
  })

  it('separates days with a date marker', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(15, 40, 0, 0)

    renderThread({
      messages: [
        makeMessage({ id: 'm-1', timestamp: yesterday }),
        makeMessage({ id: 'm-2', timestamp: new Date() }),
      ],
    })

    expect(screen.getByText('Ayer')).toBeInTheDocument()
    expect(screen.getByText('Hoy')).toBeInTheDocument()
  })
})
