import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { newQueryClient } from '@/features/settings/testing/fixtures'
import { PlatformHome } from './index'
import { usePlatformLockSync } from './hooks/use-platform-lock-sync'
import type { CompaniesSearch } from './lib/companies-search'
import {
  createFakePlatformApi,
  row,
} from './testing/fake-platform-api'

// Form-heavy flows with userEvent are slow when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 20_000 })

const hoisted = vi.hoisted(() => ({
  api: null as null | { adapter: (config: never) => Promise<unknown> },
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

// The real platform.service runs against an in-memory API, so request bodies,
// error codes and the lock interceptor are exercised for real.
vi.mock('@/lib/http', () => ({
  client: (path: string) =>
    axios.create({
      baseURL: `http://api.test${path}`,
      adapter: (config) => hoisted.api!.adapter(config as never) as never,
    }),
}))
vi.mock('sonner', () => ({ toast: hoisted.toast }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))

let fake: ReturnType<typeof createFakePlatformApi>

function setup(options: Parameters<typeof createFakePlatformApi>[0] = {}) {
  fake = createFakePlatformApi(options)
  hoisted.api = fake
  const queryClient = newQueryClient()
  const patches: Partial<CompaniesSearch>[] = []

  function Harness() {
    const [search, setSearch] = useState<CompaniesSearch>({})
    usePlatformLockSync()
    return (
      <PlatformHome
        search={search}
        onSearchChange={(patch) => {
          patches.push(patch)
          setSearch((current) => ({ ...current, ...patch }))
        }}
      />
    )
  }

  render(
    <QueryClientProvider client={queryClient}>
      <Harness />
    </QueryClientProvider>
  )
  return { queryClient, patches }
}

const unlocked = { unlocked: true }
const acme = row({ id: 'c1', name: 'Acme SAC', membersCount: 3 })
const beta = row({
  id: 'c2',
  name: 'Beta Logística',
  email: null,
  status: 'suspended',
  membersCount: 1,
  customersCount: 8,
  channelsCount: 0,
})
const gamma = row({
  id: 'c3',
  name: 'Gamma Retail',
  status: 'inactive',
  deletedAt: new Date('2026-09-01'),
})

/** Names also render in the stacked mobile list; the table is the reference. */
const findInTable = async (text: string) =>
  within(await screen.findByRole('table')).findByText(text)

const tableRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)

beforeEach(() => {
  vi.clearAllMocks()
  // jsdom lacks what Radix Select and cmdk call on open.
  Element.prototype.scrollIntoView = vi.fn()
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
})

describe('platform unlock', () => {
  it('asks for the console password when locked', async () => {
    setup()

    expect(
      await screen.findByRole('heading', { name: 'Desbloquea la consola' })
    ).toBeVisible()
    expect(screen.getByLabelText('Contraseña de la consola')).toHaveFocus()
    expect(screen.getByText(/la sesión dura 30 minutos/)).toBeVisible()
  })

  it('says the password is wrong without giving away anything else', async () => {
    const user = userEvent.setup()
    setup({
      unlockReplies: [
        { status: 403, data: { code: 'platform_invalid_password' } },
      ],
    })

    await user.type(await screen.findByLabelText('Contraseña de la consola'), 'incorrecta')
    await user.click(screen.getByRole('button', { name: 'Desbloquear' }))

    expect(
      await screen.findByText('La contraseña no es correcta. Revísala e inténtalo de nuevo.')
    ).toBeVisible()
    expect(fake.requestsTo('post', '/unlock')[0].body).toEqual({
      password: 'incorrecta',
    })
    expect(screen.getByRole('button', { name: 'Desbloquear' })).toBeEnabled()
  })

  it('will not submit an empty password', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(await screen.findByRole('button', { name: 'Desbloquear' }))

    expect(await screen.findByText('Escribe la contraseña de la consola.')).toBeVisible()
    expect(fake.requestsTo('post', '/unlock')).toHaveLength(0)
  })

  it('shows the remaining lockout time after too many tries and blocks the form', async () => {
    const user = userEvent.setup()
    setup({
      unlockReplies: [
        {
          status: 429,
          data: { code: 'platform_rate_limited', retryAfterSec: 272 },
        },
      ],
    })

    await user.type(await screen.findByLabelText('Contraseña de la consola'), 'x')
    await user.click(screen.getByRole('button', { name: 'Desbloquear' }))

    expect(
      await screen.findByText('Demasiados intentos. Puedes volver a intentarlo en 4:32.')
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Desbloquear' })).toBeDisabled()
    expect(screen.getByLabelText('Contraseña de la consola')).toBeDisabled()
  })

  it('counts the lockout down and unblocks when it ends', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    try {
      setup({ status: { retryAfterSec: 3 } })
      await vi.waitFor(() =>
        expect(
          screen.getByText('Demasiados intentos. Puedes volver a intentarlo en 0:03.')
        ).toBeVisible()
      )

      await act(async () => {
        vi.advanceTimersByTime(1000)
      })
      expect(
        screen.getByText('Demasiados intentos. Puedes volver a intentarlo en 0:02.')
      ).toBeVisible()

      await act(async () => {
        vi.advanceTimersByTime(2000)
      })
      expect(screen.queryByText(/Demasiados intentos/)).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Desbloquear' })).toBeEnabled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('explains how to enable a console that is disabled on the server', async () => {
    setup({ status: { enabled: false } })

    expect(
      await screen.findByRole('heading', { name: 'La consola está desactivada' })
    ).toBeVisible()
    expect(screen.getByText(/PLATFORM_CONSOLE_PASSWORD/)).toBeVisible()
    expect(screen.queryByLabelText('Contraseña de la consola')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a la app' })).toHaveAttribute(
      'href',
      '/'
    )
  })

  it('opens the companies table after a correct password', async () => {
    const user = userEvent.setup()
    setup({ companies: [acme] })

    await user.type(await screen.findByLabelText('Contraseña de la consola'), 'consola')
    await user.click(screen.getByRole('button', { name: 'Desbloquear' }))

    expect(await screen.findByRole('heading', { name: 'Empresas' })).toBeVisible()
    expect(within(screen.getByRole('table')).getByText('Acme SAC')).toBeVisible()
  })

  it('goes back to the unlock screen when a request answers platform_locked', async () => {
    const { queryClient } = setup({ status: unlocked, companies: [acme] })
    expect(await screen.findByRole('heading', { name: 'Empresas' })).toBeVisible()

    // The 30-minute token expires between two requests.
    fake.state.expired = true
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform', 'companies'] })
    })

    expect(
      await screen.findByRole('heading', { name: 'Desbloquea la consola' })
    ).toBeVisible()
    expect(hoisted.toast.warning).toHaveBeenCalledWith(
      'La consola se bloqueó por inactividad. Vuelve a ingresar la contraseña.'
    )
  })
})

describe('companies table', () => {
  it('lists each company with status, counts and creation date', async () => {
    setup({ status: unlocked, companies: [acme, beta] })

    await findInTable('Beta Logística')
    const [first, second] = tableRows()

    expect(within(first).getByText('Acme SAC')).toBeVisible()
    expect(within(first).getByText('hola@acme.test')).toBeVisible()
    expect(within(first).getByText('Activa')).toBeVisible()
    expect(within(first).getByText('120')).toBeVisible()
    expect(within(second).getByText('Suspendida')).toBeVisible()
    expect(screen.getByText('2 empresas')).toBeVisible()
  })

  it('invites to create the first company when there is none', async () => {
    setup({ status: unlocked, companies: [] })

    expect((await screen.findAllByText('Aún no hay empresas')).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Nueva empresa' }).length).toBeGreaterThan(0)
  })

  it('hides deleted companies until asked, muted and with a restore action', async () => {
    const user = userEvent.setup()
    const { patches } = setup({ status: unlocked, companies: [acme, gamma] })

    await findInTable('Acme SAC')
    expect(screen.queryAllByText('Gamma Retail')).toHaveLength(0)

    await user.click(screen.getByRole('switch', { name: 'Mostrar eliminadas' }))

    expect(patches).toContainEqual({ deleted: true, page: 1 })
    const deletedRow = (await findInTable('Gamma Retail')).closest('tr')!
    expect(within(deletedRow).getByText('Eliminada')).toBeVisible()
    expect(
      within(deletedRow).getByRole('button', { name: 'Restaurar Gamma Retail' })
    ).toBeVisible()
    expect(
      within(deletedRow).queryByRole('button', { name: /Eliminar/ })
    ).not.toBeInTheDocument()
    expect(fake.requestsTo('post', '/companies/table').at(-1)?.body).toMatchObject({
      includeDeleted: true,
    })
  })

  it('searches by name and filters by status through the server', async () => {
    const user = userEvent.setup()
    setup({ status: unlocked, companies: [acme, beta] })
    await findInTable('Beta Logística')

    await user.type(screen.getByRole('searchbox'), 'beta')

    await waitFor(() =>
      expect(fake.requestsTo('post', '/companies/table').at(-1)?.body).toMatchObject({
        q: 'beta',
        page: 1,
      })
    )
    await waitFor(() => expect(tableRows()).toHaveLength(1))
  })

  it('restores a deleted company and confirms it', async () => {
    const user = userEvent.setup()
    setup({ status: unlocked, companies: [acme, gamma] })
    await findInTable('Acme SAC')
    await user.click(screen.getByRole('switch', { name: 'Mostrar eliminadas' }))

    const button = (
      await screen.findAllByRole('button', { name: 'Restaurar Gamma Retail' })
    )[0]
    await user.click(button)

    await waitFor(() =>
      expect(fake.requestsTo('post', '/companies/c3/restore')).toHaveLength(1)
    )
    expect(hoisted.toast.success).toHaveBeenCalledWith(
      'Empresa «Gamma Retail» restaurada'
    )
  })
})

describe('create company', () => {
  async function openCreate(user: ReturnType<typeof userEvent.setup>) {
    await screen.findByRole('heading', { name: 'Empresas' })
    await user.click(screen.getAllByRole('button', { name: 'Nueva empresa' })[0])
    return screen.findByRole('dialog')
  }

  it('shows the generated password once, hidden until revealed, and blocks closing before it was seen', async () => {
    const user = userEvent.setup()
    setup({ status: unlocked, companies: [acme] })
    const sheet = await openCreate(user)

    await user.type(within(sheet).getByLabelText(/^Nombre$/), 'Delta Foods')
    await user.type(
      within(sheet).getByLabelText(/^Correo del administrador/),
      'jefe@delta.test'
    )
    await user.type(within(sheet).getByLabelText(/^Nombre \(opcional\)/), 'Lucía')
    await user.click(within(sheet).getByRole('button', { name: 'Crear empresa' }))

    expect(await screen.findByText('Contraseña de Lucía')).toBeVisible()
    expect(fake.requestsTo('post', '/companies')[0].body).toMatchObject({
      name: 'Delta Foods',
      admin: { email: 'jefe@delta.test', firstName: 'Lucía' },
    })
    expect(screen.getByLabelText('Contraseña oculta')).toBeVisible()
    expect(screen.queryByText(/a1b2/)).not.toBeInTheDocument()

    const done = screen.getByRole('button', { name: 'Listo, ya la guardé' })
    expect(done).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Mostrar' }))
    expect(screen.getByText('a1b2 c3d4 e5f6 a7b8')).toBeVisible()
    expect(done).toBeEnabled()
    expect(hoisted.toast.success).toHaveBeenCalledWith('Empresa «Delta Foods» creada')

    await user.click(done)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    // Reopening starts from an empty form: the secret is gone for good.
    await user.click(screen.getAllByRole('button', { name: 'Nueva empresa' })[0])
    expect(await screen.findByRole('dialog')).toBeVisible()
    expect(screen.queryByText('Contraseña de Lucía')).not.toBeInTheDocument()
  })

  it('creates a company without administrator and says nobody can enter yet', async () => {
    const user = userEvent.setup()
    setup({ status: unlocked, companies: [] })
    const sheet = await openCreate(user)

    await user.type(within(sheet).getByLabelText(/^Nombre$/), 'Solo Datos')
    await user.click(within(sheet).getByRole('button', { name: 'Crear empresa' }))

    expect(
      await screen.findByText(/La empresa quedó sin administrador/)
    ).toBeVisible()
    expect(fake.requestsTo('post', '/companies')[0].body).not.toHaveProperty('admin')
    expect(screen.queryByRole('button', { name: 'Mostrar' })).not.toBeInTheDocument()
  })

  it('tells when the administrator account already existed', async () => {
    const user = userEvent.setup()
    setup({ status: unlocked, companies: [] })
    fake.state.createReply = {
      status: 200,
      data: {
        company: row({ id: 'new', name: 'Delta Foods' }),
        adminOutcome: 'linked',
      },
    }
    const sheet = await openCreate(user)

    await user.type(within(sheet).getByLabelText(/^Nombre$/), 'Delta Foods')
    await user.type(
      within(sheet).getByLabelText(/^Correo del administrador/),
      'ana@acme.test'
    )
    await user.click(within(sheet).getByRole('button', { name: 'Crear empresa' }))

    expect(
      await screen.findByText(/ana@acme\.test ya tenía una cuenta/)
    ).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Mostrar' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Listo' }))
  })

  it('points at the fields that need fixing', async () => {
    const user = userEvent.setup()
    setup({ status: unlocked, companies: [] })
    const sheet = await openCreate(user)

    await user.type(
      within(sheet).getByLabelText(/^Correo del administrador/),
      'sin-arroba'
    )
    await user.click(within(sheet).getByRole('button', { name: 'Crear empresa' }))

    expect(await within(sheet).findAllByRole('alert')).toHaveLength(2)
    expect(within(sheet).getByText('Completa este campo.')).toBeVisible()
    expect(within(sheet).getByText(/Escribe un correo válido/)).toBeVisible()
    expect(fake.requestsTo('post', '/companies')).toHaveLength(0)
  })
})

describe('edit company', () => {
  it('opens from the row, sends the changes and confirms', async () => {
    const user = userEvent.setup()
    setup({ status: unlocked, companies: [acme] })
    await findInTable('Acme SAC')

    await user.click(screen.getAllByRole('button', { name: 'Editar Acme SAC' })[0])
    const sheet = await screen.findByRole('dialog')
    const name = within(sheet).getByLabelText(/^Nombre$/)
    expect(name).toHaveValue('Acme SAC')

    await user.clear(name)
    await user.type(name, 'Acme Perú')
    await user.click(within(sheet).getByLabelText('Estado'))
    await user.click(await screen.findByRole('option', { name: 'Suspendida' }))
    expect(
      within(sheet).getByText('Sus miembros no podrán entrar mientras esté suspendida.')
    ).toBeVisible()
    await user.click(within(sheet).getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(fake.requestsTo('patch', '/companies/c1')).toHaveLength(1)
    )
    expect(fake.requestsTo('patch', '/companies/c1')[0].body).toMatchObject({
      name: 'Acme Perú',
      status: 'suspended',
    })
    expect(hoisted.toast.success).toHaveBeenCalledWith('Cambios guardados')
  })
})

describe('delete company', () => {
  async function openDelete(user: ReturnType<typeof userEvent.setup>) {
    await findInTable('Acme SAC')
    await user.click(screen.getAllByRole('button', { name: 'Eliminar Acme SAC' })[0])
    return screen.findByRole('alertdialog')
  }

  it('states how many members lose access and waits for the company name', async () => {
    const user = userEvent.setup()
    setup({ status: unlocked, companies: [acme] })
    const dialog = await openDelete(user)

    expect(within(dialog).getByText('3 miembros perderán acceso.')).toBeVisible()
    const confirm = within(dialog).getByRole('button', { name: 'Eliminar empresa' })
    expect(confirm).toBeDisabled()

    const input = within(dialog).getByLabelText('Para confirmar, escribe «Acme SAC»')
    await user.type(input, 'Acme')
    expect(confirm).toBeDisabled()
    await user.type(input, ' SAC')
    expect(confirm).toBeEnabled()
  })

  it('deletes after the name is typed and reports the people affected', async () => {
    const user = userEvent.setup()
    setup({ status: unlocked, companies: [acme] })
    const dialog = await openDelete(user)

    await user.type(
      within(dialog).getByLabelText('Para confirmar, escribe «Acme SAC»'),
      'Acme SAC'
    )
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar empresa' }))

    await waitFor(() =>
      expect(fake.requestsTo('delete', '/companies/c1')).toHaveLength(1)
    )
    expect(hoisted.toast.success).toHaveBeenCalledWith(
      'Empresa «Acme SAC» eliminada. 3 miembros perdieron el acceso.'
    )
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    )
    expect((await screen.findAllByText('Aún no hay empresas')).length).toBeGreaterThan(0)
  })

  it('does not delete when cancelled', async () => {
    const user = userEvent.setup()
    setup({ status: unlocked, companies: [acme] })
    const dialog = await openDelete(user)

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(fake.requestsTo('delete', '/companies/c1')).toHaveLength(0)
  })

  it('uses the singular for one member', async () => {
    const user = userEvent.setup()
    setup({
      status: unlocked,
      companies: [row({ id: 'c9', name: 'Acme SAC', membersCount: 1 })],
    })
    const dialog = await openDelete(user)

    expect(within(dialog).getByText('1 miembro perderá acceso.')).toBeVisible()
  })
})
