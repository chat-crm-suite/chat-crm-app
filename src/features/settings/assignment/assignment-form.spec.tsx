import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  makeUser,
  membership,
  newQueryClient,
  signIn,
  signOut,
} from '../testing/fixtures'
import { AssignmentForm } from './assignment-form'

const mocks = vi.hoisted(() => ({
  getAssignmentSettings: vi.fn(),
  updateAssignmentSettings: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/services/company.service', () => ({
  getAssignmentSettings: mocks.getAssignmentSettings,
  updateAssignmentSettings: mocks.updateAssignmentSettings,
}))
vi.mock('sonner', () => ({ toast: mocks.toast }))

const settings = {
  autoAssignEnabled: true,
  autoAssignMaxOpen: 10,
  autoAssignSticky: true,
  autoAssignNotifySupervisors: false,
}

function renderForm() {
  render(
    <QueryClientProvider client={newQueryClient()}>
      <AssignmentForm />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getAssignmentSettings.mockResolvedValue(settings)
  signOut()
})

describe('AssignmentForm as an admin', () => {
  beforeEach(() => signIn(makeUser()))

  it('shows the current rules', async () => {
    renderForm()

    expect(
      await screen.findByRole('switch', {
        name: 'Asignar conversaciones automáticamente',
      })
    ).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Avisar a los supervisores' })).not.toBeChecked()
    expect(screen.getByLabelText('Conversaciones abiertas por agente')).toHaveValue(10)
  })

  it('saves the changed rules from the sticky bar', async () => {
    const user = userEvent.setup()
    mocks.updateAssignmentSettings.mockResolvedValue({
      ...settings,
      autoAssignMaxOpen: 6,
      autoAssignNotifySupervisors: true,
    })
    renderForm()

    await user.click(
      await screen.findByRole('switch', { name: 'Avisar a los supervisores' })
    )
    const max = screen.getByLabelText('Conversaciones abiertas por agente')
    await user.clear(max)
    await user.type(max, '6')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(mocks.updateAssignmentSettings).toHaveBeenCalledWith({
        autoAssignEnabled: true,
        autoAssignMaxOpen: 6,
        autoAssignSticky: true,
        autoAssignNotifySupervisors: true,
      })
    )
    expect(mocks.toast.success).toHaveBeenCalledWith('Cambios guardados')
  })

  it('does not accept a limit below 1', async () => {
    const user = userEvent.setup()
    renderForm()

    const max = await screen.findByLabelText('Conversaciones abiertas por agente')
    await user.clear(max)
    await user.type(max, '0')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('El valor mínimo es 1.')).toBeVisible()
    expect(mocks.updateAssignmentSettings).not.toHaveBeenCalled()
  })
})

describe('AssignmentForm as a supervisor', () => {
  it('is read-only', async () => {
    signIn(makeUser({ memberships: [membership('c1', 'supervisor')] }))
    renderForm()

    const enabled = await screen.findByRole('switch', {
      name: 'Asignar conversaciones automáticamente',
    })
    expect(enabled).toBeDisabled()
    expect(screen.getByLabelText('Conversaciones abiertas por agente')).toBeDisabled()
    expect(screen.getByText(/Solo un administrador puede cambiar la asignación/)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()
  })
})
