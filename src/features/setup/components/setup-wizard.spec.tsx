import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import type {
  SetupStatus,
  SetupStepResult,
  ValidateSetupStepInput,
} from '@/services/setup.service'
import { SetupWizard } from './setup-wizard'

const ok = (extra: Partial<SetupStepResult> = {}): SetupStepResult => ({
  ok: true,
  errors: [],
  warnings: [],
  whatsapp: null,
  ...extra,
})

const fail = (path: string, message: string): SetupStepResult => ({
  ok: false,
  errors: [{ path, message }],
  warnings: [],
  whatsapp: null,
})

const httpError = (status: number, message: string) =>
  new AxiosError(message, String(status), undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { message },
  })

/** Fills the admin and company steps (both checked by the server). */
const fillAdminAndCompany = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(await screen.findByLabelText('Usuario'), 'admin')
  await user.type(screen.getByLabelText('Contraseña'), 'secreta-123')
  await user.type(screen.getByLabelText('Repetir contraseña'), 'secreta-123')
  await user.click(screen.getByRole('button', { name: 'Siguiente' }))
  await user.type(
    await screen.findByLabelText('Nombre de la empresa'),
    'J&P Perifericos'
  )
  await user.click(screen.getByRole('button', { name: 'Siguiente' }))
}

const okValidator = () =>
  vi.fn<(input: ValidateSetupStepInput) => Promise<SetupStepResult>>(() =>
    Promise.resolve(ok())
  )

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
    render(<SetupWizard status={status()} onSubmit={vi.fn()} validateStep={okValidator()} />)

    expect(
      screen.getByRole('heading', { name: /cuenta de administrador/i })
    ).toBeInTheDocument()
  })

  it('starts on the token step when the server requires it', () => {
    render(
      <SetupWizard
        status={status({ requiresSetupToken: true })}
        onSubmit={vi.fn()}
        validateStep={okValidator()}
      />
    )

    expect(
      screen.getByRole('heading', { name: /token de configuración/i })
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText('Token de configuración')
    ).toBeInTheDocument()
  })

  it('only lists the steps that are missing', () => {
    render(<SetupWizard
        status={status({ hasCompany: true })}
        onSubmit={vi.fn()}
        validateStep={okValidator()}
      />)

    expect(screen.getByText('Administrador')).toBeInTheDocument()
    expect(screen.getByText('WhatsApp')).toBeInTheDocument()
    expect(screen.queryByText('Empresa')).not.toBeInTheDocument()
  })

  it('walks through the wizard and skips whatsapp when asked', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const validateStep = okValidator()

    render(
      <SetupWizard
        status={status()}
        onSubmit={onSubmit}
        validateStep={validateStep}
      />
    )

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
    // Every step went through the server check before moving on.
    expect(validateStep.mock.calls.map(([input]) => input.step)).toEqual([
      'admin',
      'company',
    ])
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

  it('shows a wrong token on the token step and does not advance', async () => {
    const user = userEvent.setup()
    const validateStep = vi.fn(() =>
      Promise.resolve(fail('setupToken', 'El token de configuración es incorrecto.'))
    )

    render(
      <SetupWizard
        status={status({ requiresSetupToken: true })}
        onSubmit={vi.fn()}
        validateStep={validateStep}
      />
    )

    await user.type(screen.getByLabelText('Token de configuración'), 'malo')
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(
      await screen.findByText('El token de configuración es incorrecto.')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /token de configuración/i })
    ).toBeInTheDocument()
  })

  it('keeps the admin step when the server rejects the username', async () => {
    const user = userEvent.setup()
    const validateStep = vi.fn(() =>
      Promise.resolve(fail('admin.username', 'Ya existe un usuario con ese nombre.'))
    )

    render(
      <SetupWizard status={status()} onSubmit={vi.fn()} validateStep={validateStep} />
    )

    await user.type(screen.getByLabelText('Usuario'), 'admin')
    await user.type(screen.getByLabelText('Contraseña'), 'secreta-123')
    await user.type(screen.getByLabelText('Repetir contraseña'), 'secreta-123')
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(
      await screen.findByText('Ya existe un usuario con ese nombre.')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /cuenta de administrador/i })
    ).toBeInTheDocument()
  })

  it('puts a Meta rejection on the App Secret field and does not submit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const validateStep = vi.fn((input: ValidateSetupStepInput) =>
      Promise.resolve(
        input.step === 'whatsapp'
          ? fail('whatsapp.appSecret', 'El App Secret no corresponde a la app de Meta.')
          : ok()
      )
    )

    render(
      <SetupWizard status={status()} onSubmit={onSubmit} validateStep={validateStep} />
    )

    await fillAdminAndCompany(user)
    await user.type(
      await screen.findByLabelText('Phone Number ID'),
      '123456789012345'
    )
    await user.type(screen.getByLabelText('Access Token'), 'EAAB-token')
    await user.type(
      screen.getByLabelText('App Secret (recomendado)'),
      'a'.repeat(32)
    )
    await user.click(screen.getByRole('button', { name: 'Guardar y finalizar' }))

    expect(
      await screen.findByText('El App Secret no corresponde a la app de Meta.')
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(validateStep).toHaveBeenCalledWith(
      expect.objectContaining({ step: 'whatsapp' })
    )
  })

  it('sends the user back to the token step when the final POST answers 403', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn(() =>
      Promise.reject(httpError(403, 'Falta o es incorrecto el token'))
    )

    render(
      <SetupWizard
        status={status({ requiresSetupToken: true })}
        onSubmit={onSubmit}
        validateStep={okValidator()}
      />
    )

    await user.type(screen.getByLabelText('Token de configuración'), 'token')
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await fillAdminAndCompany(user)
    await user.click(
      await screen.findByRole('button', { name: 'Saltar y finalizar' })
    )

    expect(
      await screen.findByText('El token de configuración es incorrecto.')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /token de configuración/i })
    ).toBeInTheDocument()
  })
})
