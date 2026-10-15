import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import {
  makeUser,
  newQueryClient,
  signIn,
  signOut,
} from '../testing/fixtures'
import { ProfileForm } from './profile-form'

const mocks = vi.hoisted(() => ({
  updateProfile: vi.fn(),
  uploadAvatar: vi.fn(),
  resizeAvatar: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/services/profile.service', () => ({
  updateProfile: mocks.updateProfile,
  uploadAvatar: mocks.uploadAvatar,
}))
vi.mock('../lib/resize-avatar', () => ({ resizeAvatar: mocks.resizeAvatar }))
vi.mock('sonner', () => ({ toast: mocks.toast }))

function renderForm() {
  const queryClient = newQueryClient()
  queryClient.setQueryData(['auth', 'me'], { user: makeUser() })
  render(
    <QueryClientProvider client={queryClient}>
      <ProfileForm />
    </QueryClientProvider>
  )
  return queryClient
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
  signOut()
  signIn(makeUser())
})

describe('ProfileForm', () => {
  it('shows the account data, keeps the username read-only and no save bar yet', () => {
    renderForm()

    expect(screen.getByLabelText('Nombre')).toHaveValue('Ana')
    expect(screen.getByLabelText('Apellidos')).toHaveValue('Quispe')
    expect(screen.getByLabelText('Correo')).toHaveValue('ana@acme.test')
    expect(screen.getByLabelText('Teléfono')).toBeVisible()
    expect(screen.getByLabelText('Usuario')).toHaveValue('ana')
    expect(screen.getByLabelText('Usuario')).toBeDisabled()
    expect(
      screen.queryByRole('button', { name: 'Guardar cambios' })
    ).not.toBeInTheDocument()
  })

  it('shows the save bar only while dirty and discards the edits', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Nombre'), 'bel')
    expect(screen.getByText('Tienes cambios sin guardar')).toBeVisible()
    expect(screen.getByLabelText('Nombre')).toHaveValue('Anabel')

    await user.click(screen.getByRole('button', { name: 'Descartar' }))

    expect(screen.getByLabelText('Nombre')).toHaveValue('Ana')
    expect(
      screen.queryByText('Tienes cambios sin guardar')
    ).not.toBeInTheDocument()
  })

  it('sends the edited profile without the username and refreshes the session', async () => {
    const user = userEvent.setup()
    const saved = makeUser({ firstName: 'Anabel' })
    mocks.updateProfile.mockResolvedValue(saved)
    const queryClient = renderForm()

    await user.type(screen.getByLabelText('Nombre'), 'bel')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(mocks.updateProfile).toHaveBeenCalledTimes(1))
    const payload = mocks.updateProfile.mock.calls[0][0]
    expect(payload).toEqual({
      firstName: 'Anabel',
      lastName: 'Quispe',
      phoneNumber: '+51987654321',
      email: 'ana@acme.test',
    })
    expect(payload).not.toHaveProperty('username')

    await waitFor(() =>
      expect(useAuthStore.getState().auth.user?.firstName).toBe('Anabel')
    )
    expect(
      (queryClient.getQueryData(['auth', 'me']) as { user: { firstName: string } })
        .user.firstName
    ).toBe('Anabel')
    expect(mocks.toast.success).toHaveBeenCalledWith('Cambios guardados')
    await waitFor(() =>
      expect(
        screen.queryByText('Tienes cambios sin guardar')
      ).not.toBeInTheDocument()
    )
  })

  it('explains an invalid email and does not call the API', async () => {
    const user = userEvent.setup()
    renderForm()

    const email = screen.getByLabelText('Correo')
    await user.clear(email)
    await user.type(email, 'ana@')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(
      await screen.findByText(/Escribe un correo válido/)
    ).toBeVisible()
    expect(mocks.updateProfile).not.toHaveBeenCalled()
  })

  it('points at the email field when the API says it is taken', async () => {
    const user = userEvent.setup()
    mocks.updateProfile.mockRejectedValue(
      Object.assign(new Error('conflict'), {
        isAxiosError: true,
        response: { status: 409, data: {} },
      })
    )
    renderForm()

    await user.type(screen.getByLabelText('Nombre'), 'x')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(
      await screen.findByText('Ese correo ya pertenece a otra cuenta.')
    ).toBeVisible()
  })
})

describe('avatar', () => {
  const pick = (file: File) =>
    fireEvent.change(screen.getByLabelText('Elegir una foto de perfil'), {
      target: { files: [file] },
    })

  it('resizes to a webp blob, uploads it and refreshes the sidebar user', async () => {
    const resized = new Blob(['webp-bytes'], { type: 'image/webp' })
    mocks.resizeAvatar.mockResolvedValue(resized)
    mocks.uploadAvatar.mockResolvedValue({ avatarUrl: '/users/user-1/avatar?v=99' })
    const queryClient = renderForm()

    const original = new File(['x'.repeat(10)], 'yo.png', { type: 'image/png' })
    pick(original)

    await waitFor(() => expect(mocks.uploadAvatar).toHaveBeenCalledTimes(1))
    expect(mocks.resizeAvatar).toHaveBeenCalledWith(original)
    const uploaded = mocks.uploadAvatar.mock.calls[0][0] as Blob
    expect(uploaded).toBe(resized)
    expect(uploaded.type).toBe('image/webp')

    await waitFor(() =>
      expect(useAuthStore.getState().auth.user?.avatarUrl).toBe(
        '/users/user-1/avatar?v=99'
      )
    )
    expect(
      (queryClient.getQueryData(['auth', 'me']) as { user: { avatarUrl: string } })
        .user.avatarUrl
    ).toBe('/users/user-1/avatar?v=99')
    expect(mocks.toast.success).toHaveBeenCalledWith('Foto actualizada')
  })

  it('rejects files that are not images without calling the API', () => {
    renderForm()

    pick(new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' }))

    expect(mocks.resizeAvatar).not.toHaveBeenCalled()
    expect(mocks.uploadAvatar).not.toHaveBeenCalled()
    expect(mocks.toast.error).toHaveBeenCalledWith(
      'Ese archivo no es una imagen. Elige un JPG, PNG o WebP.'
    )
  })

  it('tells the person when the upload fails and keeps the old photo', async () => {
    mocks.resizeAvatar.mockResolvedValue(new Blob(['x'], { type: 'image/webp' }))
    mocks.uploadAvatar.mockRejectedValue(new Error('network'))
    renderForm()

    pick(new File(['x'], 'yo.png', { type: 'image/png' }))

    await waitFor(() =>
      expect(mocks.toast.error).toHaveBeenCalledWith(
        'No se pudo subir la foto. Prueba con otra imagen.'
      )
    )
    expect(useAuthStore.getState().auth.user?.avatarUrl).toBeNull()
  })
})
