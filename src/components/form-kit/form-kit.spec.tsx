import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Field } from './field'
import { FormSheet } from './form-sheet'
import { SecretRevealCard } from './secret-reveal-card'

describe('Field', () => {
  it('wires the label, hint and error to the control', () => {
    const { rerender } = render(
      <Field label='Correo' hint='Con este correo iniciará sesión.'>
        <input />
      </Field>
    )

    const input = screen.getByLabelText('Correo')
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input).toHaveAccessibleDescription('Con este correo iniciará sesión.')

    rerender(
      <Field label='Correo' hint='Con este correo iniciará sesión.' error='Correo inválido'>
        <input />
      </Field>
    )
    expect(screen.getByLabelText('Correo')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Correo')).toHaveAccessibleDescription(
      'Correo inválido'
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Correo inválido')
    expect(
      screen.queryByText('Con este correo iniciará sesión.')
    ).not.toBeInTheDocument()
  })

  it('marks optional fields in words instead of asterisks', () => {
    render(
      <Field label='Apellidos' optional>
        <input />
      </Field>
    )

    expect(screen.getByText('(opcional)')).toBeVisible()
  })
})

describe('FormSheet', () => {
  const renderSheet = (props: Partial<React.ComponentProps<typeof FormSheet>> = {}) => {
    const onOpenChange = vi.fn()
    const onSubmit = vi.fn()
    render(
      <FormSheet
        open
        onOpenChange={onOpenChange}
        title='Agregar miembro'
        onSubmit={onSubmit}
        submitLabel='Guardar'
        {...props}
      >
        <input aria-label='Correo' />
      </FormSheet>
    )
    return { onOpenChange, onSubmit }
  }

  it('submits with the primary button and with Ctrl+Enter', async () => {
    const { onSubmit } = renderSheet()

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)

    await userEvent.type(screen.getByLabelText('Correo'), 'x')
    await userEvent.keyboard('{Control>}{Enter}{/Control}')
    expect(onSubmit).toHaveBeenCalledTimes(2)
  })

  it('closes a clean form straight away', async () => {
    const { onOpenChange } = renderSheet()

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('asks before discarding a dirty form and keeps it open on "seguir"', async () => {
    const { onOpenChange } = renderSheet({ isDirty: true })

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByText('¿Descartar los cambios?')).toBeVisible()

    await userEvent.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(onOpenChange).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('swaps the form for a result step with its own title', () => {
    renderSheet({ result: <p>Hecho</p>, resultTitle: 'Miembro agregado' })

    expect(screen.getByText('Miembro agregado')).toBeVisible()
    expect(screen.getByText('Hecho')).toBeVisible()
    expect(screen.queryByLabelText('Correo')).not.toBeInTheDocument()
  })
})

describe('SecretRevealCard', () => {
  const secret = 'Kq7mT2wXp9RbZf'

  it('hides the secret and blocks closing until it was seen or copied', async () => {
    const onDone = vi.fn()
    render(
      <SecretRevealCard
        secret={secret}
        title='Contraseña de Ana'
        description='Entrégasela a Ana.'
        onDone={onDone}
      />
    )

    expect(screen.queryByText(/Kq7m/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ya la guardé/i })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: /mostrar/i }))
    expect(screen.getByText('Kq7m T2wX p9Rb Zf')).toBeVisible()

    const done = screen.getByRole('button', { name: /ya la guardé/i })
    expect(done).toBeEnabled()
    await userEvent.click(done)
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('copies without revealing and enables closing', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    render(
      <SecretRevealCard
        secret={secret}
        title='Contraseña de Ana'
        description='Entrégasela a Ana.'
        onDone={vi.fn()}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /copiar/i }))

    expect(writeText).toHaveBeenCalledWith(secret)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /ya la guardé/i })).toBeEnabled()
    )
    expect(screen.getByRole('button', { name: /copiada/i })).toBeVisible()
    expect(screen.queryByText(/Kq7m/)).not.toBeInTheDocument()
  })
})
