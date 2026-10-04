import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SetupStatus } from '@/services/setup.service'
import { SetupWizard } from './setup-wizard'

const status = (overrides: Partial<SetupStatus> = {}): SetupStatus => ({
  initialized: false,
  hasAdmin: false,
  hasCompany: false,
  hasWhatsapp: false,
  hasUsers: false,
  requiresSetupToken: false,
  ...overrides,
})

describe('SetupWizard', () => {
  it('starts on the admin step for a fresh app', () => {
    render(<SetupWizard status={status()} onSubmit={vi.fn()} />)

    expect(
      screen.getByRole('heading', { name: /cuenta de administrador/i })
    ).toBeInTheDocument()
  })

  it('starts on the token step when the server requires it', () => {
    render(
      <SetupWizard status={status({ requiresSetupToken: true })} onSubmit={vi.fn()} />
    )

    expect(
      screen.getByRole('heading', { name: /token de configuración/i })
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText('Token de configuración')
    ).toBeInTheDocument()
  })

  it('only lists the steps that are missing', () => {
    render(<SetupWizard status={status({ hasCompany: true })} onSubmit={vi.fn()} />)

    expect(screen.getByText('Administrador')).toBeInTheDocument()
    expect(screen.getByText('WhatsApp')).toBeInTheDocument()
    expect(screen.queryByText('Empresa')).not.toBeInTheDocument()
  })

  it('walks through the wizard and skips whatsapp when asked', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<SetupWizard status={status()} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Usuario'), 'admin')
    await user.type(screen.getByLabelText('Contraseña'), 'secreta-123')
    await user.type(screen.getByLabelText('Repetir contraseña'), 'secreta-123')
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    await user.type(
      await screen.findByLabelText('Nombre de la empresa'),
      'J&P Perifericos'
    )
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    await user.click(
      await screen.findByRole('button', { name: 'Saltar y finalizar' })
    )

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const payload = onSubmit.mock.calls[0][0]
    expect(payload.whatsapp).toBeUndefined()
    expect(payload.company.name).toBe('J&P Perifericos')
    expect(payload.admin.username).toBe('admin')
  })

  it('lets the action row wrap so the buttons never overflow the card', () => {
    render(
      <SetupWizard
        status={status({ hasAdmin: true, hasCompany: true })}
        onSubmit={vi.fn()}
      />
    )

    expect(screen.getByTestId('setup-actions')).toHaveClass('flex-wrap')
    expect(screen.getByTestId('setup-action-buttons')).toHaveClass(
      'flex-wrap',
      'min-w-0'
    )

    // En el paso de WhatsApp hay dos acciones: se reparten el ancho en pantallas
    // pequeñas en vez de desbordar la tarjeta.
    expect(
      screen.getByRole('button', { name: 'Saltar y finalizar' })
    ).toHaveClass('flex-1')
    expect(
      screen.getByRole('button', { name: 'Guardar y finalizar' })
    ).toHaveClass('flex-1')
  })

  it('keeps the action buttons stable while the request is pending', () => {
    const props = {
      status: status({ hasAdmin: true, hasCompany: true }),
      onSubmit: vi.fn(),
    }
    const { rerender } = render(<SetupWizard {...props} />)

    expect(
      screen.getByRole('button', { name: 'Guardar y finalizar' })
    ).toBeInTheDocument()

    rerender(<SetupWizard {...props} isPending />)

    // El spinner aparece sin cambiar el nombre accesible ni romper el layout.
    expect(
      screen.getByRole('button', { name: 'Guardar y finalizar' })
    ).toBeInTheDocument()
    expect(screen.getByTestId('setup-action-buttons')).toHaveClass('flex-wrap')
  })
})
