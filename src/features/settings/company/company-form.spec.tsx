import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listTimeZones } from '../components/timezone-select'
import {
  makeUser,
  membership,
  newQueryClient,
  signIn,
  signOut,
} from '../testing/fixtures'
import { CompanyForm } from './company-form'

// Form-heavy flows with userEvent are slow when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 20_000 })

const mocks = vi.hoisted(() => ({
  getCompanyProfile: vi.fn(),
  updateCompanyProfile: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/services/company.service', () => ({
  getCompanyProfile: mocks.getCompanyProfile,
  updateCompanyProfile: mocks.updateCompanyProfile,
}))
vi.mock('sonner', () => ({ toast: mocks.toast }))

const company = {
  id: 'c1',
  name: 'Acme SAC',
  email: 'hola@acme.test',
  phoneNumber: '+51987654321',
  address: 'Av. Larco 123, Lima',
  timezone: 'America/Bogota',
  status: 'active' as const,
}

function renderForm() {
  render(
    <QueryClientProvider client={newQueryClient()}>
      <CompanyForm />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  Element.prototype.scrollIntoView = vi.fn()
  mocks.getCompanyProfile.mockResolvedValue(company)
  signOut()
})

describe('CompanyForm as an admin', () => {
  beforeEach(() => signIn(makeUser()))

  it('loads the company and saves only through the sticky bar', async () => {
    renderForm()

    expect(await screen.findByLabelText('Nombre')).toHaveValue('Acme SAC')
    expect(screen.getByLabelText('Correo de contacto')).toHaveValue('hola@acme.test')
    expect(screen.getByLabelText('Dirección')).toHaveValue('Av. Larco 123, Lima')
    expect(screen.getByLabelText('Zona horaria')).toHaveTextContent('America/Bogota')
    expect(
      screen.queryByRole('button', { name: 'Guardar cambios' })
    ).not.toBeInTheDocument()
  })

  it('sends the edited company and confirms', async () => {
    const user = userEvent.setup()
    mocks.updateCompanyProfile.mockResolvedValue({ ...company, name: 'Acme Perú' })
    renderForm()

    const name = await screen.findByLabelText('Nombre')
    await user.clear(name)
    await user.type(name, 'Acme Perú')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(mocks.updateCompanyProfile).toHaveBeenCalledWith({
        name: 'Acme Perú',
        email: 'hola@acme.test',
        phoneNumber: '+51987654321',
        address: 'Av. Larco 123, Lima',
        timezone: 'America/Bogota',
      })
    )
    expect(mocks.toast.success).toHaveBeenCalledWith('Cambios guardados')
    await waitFor(() =>
      expect(screen.queryByText('Tienes cambios sin guardar')).not.toBeInTheDocument()
    )
  })

  it('picks a time zone from the searchable list', async () => {
    const user = userEvent.setup()
    mocks.updateCompanyProfile.mockResolvedValue(company)
    renderForm()

    await user.click(await screen.findByLabelText('Zona horaria'))
    await user.type(screen.getByPlaceholderText('Buscar zona horaria'), 'Lima')
    await user.click(await screen.findByRole('option', { name: /America\/Lima/ }))

    expect(screen.getByLabelText('Zona horaria')).toHaveTextContent('America/Lima')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(mocks.updateCompanyProfile).toHaveBeenCalledWith(
        expect.objectContaining({ timezone: 'America/Lima' })
      )
    )
  })

  it('requires a name and says what to fix', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.clear(await screen.findByLabelText('Nombre'))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Completa este campo.')).toBeVisible()
    expect(mocks.updateCompanyProfile).not.toHaveBeenCalled()
  })

  it('keeps the edits and reports a failed save', async () => {
    const user = userEvent.setup()
    mocks.updateCompanyProfile.mockRejectedValue(new Error('500'))
    renderForm()

    await user.type(await screen.findByLabelText('Nombre'), ' 2')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(mocks.toast.error).toHaveBeenCalledWith(
        'No se pudieron guardar los datos. Revisa los campos marcados.'
      )
    )
    expect(screen.getByLabelText('Nombre')).toHaveValue('Acme SAC 2')
  })

  it('offers a retry when the company cannot be loaded', async () => {
    const user = userEvent.setup()
    mocks.getCompanyProfile.mockRejectedValueOnce(new Error('down'))
    renderForm()

    expect(
      await screen.findByText(/No se pudieron cargar los datos de la empresa/)
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByLabelText('Nombre')).toHaveValue('Acme SAC')
  })
})

describe('CompanyForm as a supervisor', () => {
  beforeEach(() =>
    signIn(makeUser({ memberships: [membership('c1', 'supervisor')] }))
  )

  it('shows the data read-only, with no way to save', async () => {
    renderForm()

    const name = await screen.findByLabelText('Nombre')
    expect(name).toHaveValue('Acme SAC')
    expect(name).toBeDisabled()
    expect(screen.getByLabelText('Correo de contacto')).toBeDisabled()
    expect(screen.getByLabelText('Dirección')).toBeDisabled()
    expect(screen.getByLabelText('Zona horaria')).toBeDisabled()
    expect(
      screen.getByText(/Solo un administrador puede cambiar los datos de la empresa/)
    ).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Guardar cambios' })
    ).not.toBeInTheDocument()
  })
})

describe('listTimeZones', () => {
  it('lists the IANA zones and keeps an unknown stored one selectable', () => {
    const zones = listTimeZones('Etc/Custom-Zone')
    expect(zones).toContain('America/Lima')
    expect(zones[0]).toBe('Etc/Custom-Zone')
    expect(listTimeZones('America/Lima')).not.toContain('Etc/Custom-Zone')
  })
})
