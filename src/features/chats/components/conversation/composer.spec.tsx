import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { Composer } from './composer'

const setup = (connected = true) => {
  const onSend = vi.fn()
  render(<Composer connected={connected} onSend={onSend} />)
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
})
