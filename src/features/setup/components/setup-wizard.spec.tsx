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
  ...overrides,
})

describe('SetupWizard', () => {
  it('starts on the admin step for a fresh app', () => {
    render(<SetupWizard status={status()} onSubmit={vi.fn()} />)

    expect(
      screen.getByRole('heading', { name: /cuenta de administrador/i })
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
})
