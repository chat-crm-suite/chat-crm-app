import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { Composer } from './composer'

/**
 * Drafts from the Phase 3 copy (greeting, sending the quote, requesting the
 * payment receipt), pinned literally instead of recomputed through the
 * component.
 */
const DRAFTS = {
  greeting: '¡Hola! Gracias por escribirnos. ¿En qué puedo ayudarte?',
  quote:
    'Te comparto la cotización solicitada. Quedo atento a cualquier consulta.',
  receipt: '¿Podrías enviarnos el comprobante de pago, por favor?',
} as const

const setup = (
  connected = true,
  props: Partial<ComponentProps<typeof Composer>> = {}
) => {
  const onSend = vi.fn()
  render(<Composer connected={connected} onSend={onSend} {...props} />)
  return { onSend, user: userEvent.setup() }
}

describe('Composer', () => {
  it('sends the trimmed draft on Enter and clears the field', async () => {
    const { onSend, user } = setup()
    const field = screen.getByPlaceholderText('Escribe un mensaje…')

    await user.type(field, '  Hola Rosa  {Enter}')

    expect(onSend).toHaveBeenCalledWith('Hola Rosa')
    expect(field).toHaveValue('')
  })

  it('breaks the line on Shift+Enter without sending', async () => {
    const { onSend, user } = setup()
    const field = screen.getByPlaceholderText('Escribe un mensaje…')

    await user.type(field, 'Línea 1{Shift>}{Enter}{/Shift}Línea 2')

    expect(onSend).not.toHaveBeenCalled()
    expect(field).toHaveValue('Línea 1\nLínea 2')
  })

  it('does not send an empty draft', async () => {
    const { onSend, user } = setup()

    await user.type(
      screen.getByPlaceholderText('Escribe un mensaje…'),
      '   {Enter}'
    )

    expect(onSend).not.toHaveBeenCalled()
  })

  it('disables the field and send while disconnected and shows the banner', () => {
    setup(false)

    const field = screen.getByPlaceholderText('Reconectando…')
    expect(field).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Enviar mensaje' })).toBeDisabled()
    expect(screen.getByText(/sin conexión/i)).toBeInTheDocument()
  })

  it('keeps attachment actions disabled until the API supports them', () => {
    setup()

    expect(
      screen.getByRole('button', { name: 'Enviar imagen (próximamente)' })
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Adjuntar archivo (próximamente)' })
    ).toBeDisabled()
  })

  it.each([
    ['Saludo', DRAFTS.greeting],
    ['Cotización', DRAFTS.quote],
    ['Comprobante', DRAFTS.receipt],
  ])('inserts the %s draft without sending', async (label, draft) => {
    const { onSend, user } = setup()
    const field = screen.getByPlaceholderText('Escribe un mensaje…')

    await user.click(screen.getByRole('button', { name: label }))

    expect(field).toHaveValue(draft)
    expect(onSend).not.toHaveBeenCalled()
  })

  it('focuses the field after inserting, so the draft sends like typed text', async () => {
    const { onSend, user } = setup()
    const field = screen.getByPlaceholderText('Escribe un mensaje…')

    await user.click(screen.getByRole('button', { name: 'Saludo' }))
    expect(field).toHaveFocus()

    await user.keyboard('{Enter}')

    expect(onSend).toHaveBeenCalledWith(DRAFTS.greeting)
    expect(field).toHaveValue('')
  })

  it('keeps the quick replies visible but disabled while disconnected', () => {
    setup(false)

    expect(screen.getByRole('button', { name: 'Saludo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cotización' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Comprobante' })).toBeDisabled()
  })

  it('shows the closed-case notice only when the conversation is closed', () => {
    setup(true, { status: 'open' })

    expect(screen.queryByText('Caso resuelto')).not.toBeInTheDocument()
  })

  it('tells the agent the case is closed and ships Reopen disabled with the hint', () => {
    setup(true, { status: 'closed' })

    expect(screen.getByText('Caso resuelto')).toBeInTheDocument()
    expect(screen.getByText(/este caso está cerrado/i)).toBeInTheDocument()

    const reopen = screen.getByRole('button', { name: /reabrir/i })
    expect(reopen).toBeDisabled()
    expect(reopen).toHaveAttribute('title', 'Próximamente: reabrir el caso')
  })

  it('hides the quick replies once the case is resolved', () => {
    setup(true, { status: 'closed' })

    expect(
      screen.queryByRole('button', { name: 'Saludo' })
    ).not.toBeInTheDocument()
  })

  it('does not block the composer: a closed case still sends normally', async () => {
    const { onSend, user } = setup(true, { status: 'closed' })
    const field = screen.getByPlaceholderText('Escribe un mensaje…')

    await user.type(field, 'Mensaje con el caso resuelto{Enter}')

    expect(onSend).toHaveBeenCalledWith('Mensaje con el caso resuelto')
    expect(field).toHaveValue('')
  })
})
