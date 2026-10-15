import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import { makeUser, newQueryClient, signIn, signOut } from '../testing/fixtures'
import { SecurityForm } from './security-form'

const mocks = vi.hoisted(() => ({
  changePassword: vi.fn(),
  revokeAllSessions: vi.fn(),
  navigate: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/services/profile.service', () => ({
  changePassword: mocks.changePassword,
  revokeAllSessions: mocks.revokeAllSessions,
}))
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}))
vi.mock('sonner', () => ({ toast: mocks.toast }))

function renderForm() {
  const queryClient = newQueryClient()
  queryClient.setQueryData(['auth', 'me'], { user: makeUser() })
  render(
    <QueryClientProvider client={queryClient}>
      <SecurityForm />
    </QueryClientProvider>
  )
  return queryClient
}

async function fill(
  user: ReturnType<typeof userEvent.setup>,
  values: { current?: string; next?: string; confirm?: string }
) {
  if (values.current !== undefined)
    await user.type(screen.getByLabelText('Contraseña actual'), values.current)
  if (values.next !== undefined)
    await user.type(screen.getByLabelText('Nueva contraseña'), values.next)
  if (values.confirm !== undefined)
    await user.type(
      screen.getByLabelText('Repite la nueva contraseña'),
      values.confirm
    )
}

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

beforeEach(() => {
  vi.clearAllMocks()
  signOut()
  signIn(makeUser())
})

describe('SecurityForm: change password', () => {
  it('has nothing to save until something is typed', () => {
    renderForm()
    expect(
      screen.queryByRole('button', { name: 'Cambiar contraseña' })
    ).not.toBeInTheDocument()
  })

  it('refuses a confirmation that does not match and sends nothing', async () => {
    const user = userEvent.setup()
    renderForm()

    await fill(user, { current: 'vieja-clave', next: 'nueva-clave-1', confirm: 'nueva-clave-2' })
    await submit(user)

    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeVisible()
    expect(mocks.changePassword).not.toHaveBeenCalled()
  })

  it('asks for at least 8 characters using the contract rule', async () => {
    const user = userEvent.setup()
    renderForm()

    await fill(user, { current: 'vieja-clave', next: 'corta', confirm: 'corta' })
    await submit(user)

    expect(await screen.findByText('Escribe al menos 8 caracteres.')).toBeVisible()
    expect(mocks.changePassword).not.toHaveBeenCalled()
  })

  it('rejects reusing the current password', async () => {
    const user = userEvent.setup()
    renderForm()

    await fill(user, { current: 'misma-clave-1', next: 'misma-clave-1', confirm: 'misma-clave-1' })
    await submit(user)

    expect(
      await screen.findByText('La nueva contraseña debe ser distinta de la actual.')
    ).toBeVisible()
    expect(mocks.changePassword).not.toHaveBeenCalled()
  })

  it('changes the password without sending the confirmation field, then clears the form', async () => {
    const user = userEvent.setup()
    mocks.changePassword.mockResolvedValue(undefined)
    renderForm()

    await fill(user, { current: 'vieja-clave', next: 'nueva-clave-1', confirm: 'nueva-clave-1' })
    await submit(user)

    await waitFor(() =>
      expect(mocks.changePassword).toHaveBeenCalledWith({
        currentPassword: 'vieja-clave',
        newPassword: 'nueva-clave-1',
      })
    )
    expect(mocks.toast.success).toHaveBeenCalledWith('Contraseña actualizada')
    await waitFor(() =>
      expect(screen.getByLabelText('Contraseña actual')).toHaveValue('')
    )
  })

  it('marks the current password field when the API rejects it', async () => {
    const user = userEvent.setup()
    mocks.changePassword.mockRejectedValue(
      Object.assign(new Error('forbidden'), {
        isAxiosError: true,
        response: { status: 403, data: {} },
      })
    )
    renderForm()

    await fill(user, { current: 'equivocada', next: 'nueva-clave-1', confirm: 'nueva-clave-1' })
    await submit(user)

    expect(
      await screen.findByText('La contraseña actual no es correcta.')
    ).toBeVisible()
    expect(mocks.toast.success).not.toHaveBeenCalled()
  })
})

describe('SecurityForm: sessions', () => {
  it('asks before closing every session', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(
      screen.getByRole('button', { name: 'Cerrar sesión en todos los dispositivos' })
    )

    expect(
      await screen.findByRole('alertdialog', { name: '¿Cerrar todas las sesiones?' })
    ).toBeVisible()
    expect(mocks.revokeAllSessions).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(mocks.revokeAllSessions).not.toHaveBeenCalled()
  })

  it('revokes every session, clears the local session and goes to sign-in', async () => {
    const user = userEvent.setup()
    mocks.revokeAllSessions.mockResolvedValue(undefined)
    const queryClient = renderForm()

    await user.click(
      screen.getByRole('button', { name: 'Cerrar sesión en todos los dispositivos' })
    )
    await user.click(
      await screen.findByRole('button', { name: 'Cerrar todas las sesiones' })
    )

    await waitFor(() => expect(mocks.revokeAllSessions).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith({ to: '/sign-in', replace: true })
    )
    expect(useAuthStore.getState().auth.user).toBeNull()
    expect(queryClient.getQueryData(['auth', 'me'])).toBeUndefined()
  })

  it('stays signed in and says so when revoking fails', async () => {
    const user = userEvent.setup()
    mocks.revokeAllSessions.mockRejectedValue(new Error('network'))
    renderForm()

    await user.click(
      screen.getByRole('button', { name: 'Cerrar sesión en todos los dispositivos' })
    )
    await user.click(
      await screen.findByRole('button', { name: 'Cerrar todas las sesiones' })
    )

    await waitFor(() =>
      expect(mocks.toast.error).toHaveBeenCalledWith(
        'No se pudieron cerrar las sesiones. Inténtalo de nuevo.'
      )
    )
    expect(mocks.navigate).not.toHaveBeenCalled()
    expect(useAuthStore.getState().auth.user).not.toBeNull()
  })
})
