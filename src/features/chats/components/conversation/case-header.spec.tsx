import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Chat } from '../../types/chat.domain'
import { CaseHeader } from './case-header'

/**
 * UUID v7 fixture. The header derives the short identifier from it
 * (FNV-1a folded into 1000-9999): `#1371`, pinned here from the documented
 * derivation, not recomputed through the implementation.
 */
const CONVERSATION_ID = '0199b7f0-2f3a-7c1e-9d4b-6a7c8e9f0a1b'

function makeChat(overrides: Partial<Chat> = {}): Chat {
  return {
    id: CONVERSATION_ID,
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

const renderHeader = (
  props: Partial<ComponentProps<typeof CaseHeader>> = {}
) => {
  const onTake = vi.fn()
  const onBack = vi.fn()
  render(
    <CaseHeader chat={makeChat()} onTake={onTake} onBack={onBack} {...props} />
  )
  return { onTake, onBack }
}

describe('CaseHeader', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows the customer name, short case identifier and phone', () => {
    renderHeader()

    expect(screen.getByText('Rosa Medina')).toBeInTheDocument()
    expect(screen.getByText('#1371')).toBeInTheDocument()
    expect(screen.getByText('+51 987 654 321')).toBeInTheDocument()
  })

  it.each([
    ['open', 'Abierto'],
    ['pending', 'Pendiente'],
    ['closed', 'Resuelto'],
    ['archived', 'Archivado'],
  ] as const)('shows the real status pill (%s -> %s)', (status, label) => {
    renderHeader({ chat: makeChat({ status }) })

    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('ships Resolve visibly disabled with the coming-soon hint', () => {
    renderHeader()

    const resolve = screen.getByRole('button', { name: /resolver/i })
    expect(resolve).toBeDisabled()
    expect(resolve).toHaveAttribute('title', 'Próximamente: resolver el caso')
  })

  it('keeps the options menu honest: disabled with the coming-soon hint', () => {
    renderHeader()

    const options = screen.getByRole('button', { name: /más opciones/i })
    expect(options).toBeDisabled()
    expect(options).toHaveAttribute(
      'title',
      'Próximamente: más acciones del caso'
    )
  })

  it('keeps Take functional for an unassigned conversation', async () => {
    const user = userEvent.setup()
    const { onTake } = renderHeader({ chat: makeChat({ isUnassigned: true }) })

    await user.click(screen.getByRole('button', { name: 'Tomar' }))

    expect(onTake).toHaveBeenCalledTimes(1)
  })

  it('disables Take while the claim is in flight', () => {
    renderHeader({ chat: makeChat({ isUnassigned: true }), taking: true })

    expect(screen.getByRole('button', { name: 'Tomando…' })).toBeDisabled()
  })

  it('offers no Take once the conversation has an owner', () => {
    renderHeader({
      chat: makeChat({ member: { id: 'member-1', username: 'aron' } }),
    })

    expect(
      screen.queryByRole('button', { name: 'Tomar' })
    ).not.toBeInTheDocument()
  })

  it('keeps the mobile back navigation wired', async () => {
    const user = userEvent.setup()
    const { onBack } = renderHeader()

    await user.click(screen.getByRole('button', { name: 'Volver a la lista' }))

    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('opens the case detail from the header trigger', async () => {
    const user = userEvent.setup()
    const onOpenDetails = vi.fn()
    renderHeader({ onOpenDetails })

    await user.click(screen.getByRole('button', { name: 'Detalle del caso' }))

    expect(onOpenDetails).toHaveBeenCalledTimes(1)
  })

  it('ships no detail trigger when the owner does not wire one', () => {
    renderHeader()

    expect(
      screen.queryByRole('button', { name: 'Detalle del caso' })
    ).not.toBeInTheDocument()
  })
})
