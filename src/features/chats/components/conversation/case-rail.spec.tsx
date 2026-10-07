import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Chat, ChatMessage, ChatSentiment } from '../../types/chat.domain'
import { CaseRail } from './case-rail'
import { ToneControl } from './tone-control'
import { TONE_MODE_STORAGE_KEY } from './tone-mode'

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60 * 1000)

function makeChat(overrides: Partial<Chat> = {}): Chat {
  return {
    id: 'c-1',
    status: 'open',
    createdAt: new Date('2026-10-01T08:00:00'),
    customer: {
      id: 'customer-1',
      displayName: 'Rosa Medina',
      phone: '+51987654321',
    },
    ...overrides,
  }
}

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'm-1',
    conversationId: 'c-1',
    // 9 h 28 min ago -> 14 h 32 min left of the window.
    timestamp: minutesAgo(9 * 60 + 28),
    status: 'read',
    sender: { id: 'customer-1', type: 'customer' },
    msg: { type: 'text', mediaUrl: null, content: { body: 'Hola' } },
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

const renderRail = (props: Partial<ComponentProps<typeof CaseRail>> = {}) => {
  const onTake = vi.fn()
  render(
    <CaseRail
      chat={makeChat()}
      messages={[makeMessage()]}
      sentiment={sentiment}
      onTake={onTake}
      {...props}
    />
  )
  return { onTake }
}

describe('CaseRail', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows the customer card with display name and phone', () => {
    renderRail()

    expect(
      screen.getByRole('complementary', { name: 'Detalle del caso' })
    ).toBeInTheDocument()
    expect(screen.getByText('Rosa Medina')).toBeInTheDocument()
    expect(screen.getByText('+51 987 654 321')).toBeInTheDocument()
  })

  it('shows the real status of the case', () => {
    renderRail({ chat: makeChat({ status: 'closed' }) })

    expect(screen.getByText('Resuelto')).toBeInTheDocument()
  })

  it('hides the priority row when the conversation carries no priority', () => {
    renderRail()

    expect(screen.queryByText('Prioridad')).not.toBeInTheDocument()
  })

  it('shows the priority only when the conversation carries one', () => {
    renderRail({ chat: makeChat({ priority: 'urgent' }) })

    expect(screen.getByText('Prioridad')).toBeInTheDocument()
    expect(screen.getByText('Urgente')).toBeInTheDocument()
  })

  it('shows Take for an unassigned conversation and reuses the claim callback', async () => {
    const user = userEvent.setup()
    const { onTake } = renderRail({ chat: makeChat({ isUnassigned: true }) })

    expect(screen.getByText('Sin asignar')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tomar chat' }))

    expect(onTake).toHaveBeenCalledTimes(1)
  })

  it('treats a null member as unassigned', () => {
    renderRail({ chat: makeChat({ member: null }) })

    expect(screen.getByText('Sin asignar')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Tomar chat' })
    ).toBeInTheDocument()
  })

  it('disables Take while the claim is in flight', () => {
    renderRail({ chat: makeChat({ isUnassigned: true }), taking: true })

    expect(screen.getByRole('button', { name: 'Tomando…' })).toBeDisabled()
  })

  it('shows the assignee when the conversation carries one', () => {
    renderRail({
      chat: makeChat({ member: { id: 'member-2', username: 'rosa.medina' } }),
    })

    expect(screen.getByText('@rosa.medina')).toBeInTheDocument()
  })

  it('marks my own conversations as assigned to me', () => {
    renderRail()

    expect(screen.getByText('Asignado a ti')).toBeInTheDocument()
  })

  it('shows the channel as WhatsApp', () => {
    renderRail()

    expect(screen.getByText('WhatsApp')).toBeInTheDocument()
  })

  it('shows the tone panel with the same aggregate as the header control', () => {
    renderRail()

    expect(screen.getByText('Sentimiento')).toBeInTheDocument()
    expect(screen.getByText('Tono positivo')).toBeInTheDocument()
    expect(screen.getByText('52%')).toBeInTheDocument()
    expect(screen.getByText('48 mensajes analizados')).toBeInTheDocument()
  })

  it('hides the tone panel in off mode', () => {
    localStorage.setItem(TONE_MODE_STORAGE_KEY, 'off')
    renderRail()

    expect(screen.queryByText('Sentimiento')).not.toBeInTheDocument()
    expect(screen.queryByText('Tono positivo')).not.toBeInTheDocument()
  })

  it('hides the rail tone panel when the header control switches tone off', async () => {
    const user = userEvent.setup()
    render(
      <>
        <ToneControl sentiment={sentiment} />
        <CaseRail
          chat={makeChat()}
          messages={[makeMessage()]}
          sentiment={sentiment}
          onTake={vi.fn()}
        />
      </>
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

  it('points to the template flow when the window expired, disabled until it ships', () => {
    renderRail({ messages: [makeMessage({ timestamp: minutesAgo(25 * 60) })] })

    expect(
      screen.getByText('Ventana vencida · usa una plantilla')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Usar plantilla (próximamente)' })
    ).toBeDisabled()
  })

  it('shows no window when the customer has not written yet', () => {
    renderRail({
      messages: [makeMessage({ sender: { id: 'member-1', type: 'member' } })],
    })

    expect(
      screen.getByText('Aún no hay mensajes del cliente')
    ).toBeInTheDocument()
  })
})
