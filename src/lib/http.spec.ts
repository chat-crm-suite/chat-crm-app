import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { AuthUser } from '@chat-crm/contracts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import { onSessionRefreshed, refreshSession, withTenantContext } from './http'

const sessionUser = (companyIds: string[]): AuthUser => ({
  id: 'user-1',
  username: 'jeremi',
  isPlatformAdmin: false,
  memberships: companyIds.map((companyId) => ({
    id: `member-${companyId}`,
    companyId,
    companyName: companyId,
    role: 'agent',
    status: 'active',
  })),
})

const ok = (config: InternalAxiosRequestConfig): AxiosResponse => ({
  data: { company: config.headers.get('x-company-id') },
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
})

const stale = (config: InternalAxiosRequestConfig) =>
  new AxiosError('stale', 'ERR_BAD_REQUEST', config, null, {
    data: { statusCode: 401, code: 'token_stale' },
    status: 401,
    statusText: 'Unauthorized',
    headers: {},
    config,
  })

/** Instance whose transport answers with `respond` (no network). */
function instanceWith(respond: AxiosAdapter) {
  const adapter = vi.fn(respond)
  return { api: withTenantContext(axios.create({ adapter })), adapter }
}

describe('withTenantContext', () => {
  let post: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    useAuthStore.getState().auth.setSession(sessionUser(['company-x', 'company-y']))
    useAuthStore.getState().auth.setCompany({ id: 'company-x' })
    post = vi.spyOn(axios, 'post')
  })

  afterEach(() => {
    useAuthStore.getState().auth.reset()
    sessionStorage.clear()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('sends the active company on every request and follows a local switch', async () => {
    const { api } = instanceWith((config) => Promise.resolve(ok(config)))

    await expect(api.get('/a')).resolves.toMatchObject({ data: { company: 'company-x' } })

    useAuthStore.getState().auth.setCompany({ id: 'company-y' })
    await expect(api.get('/a')).resolves.toMatchObject({ data: { company: 'company-y' } })
    expect(post).not.toHaveBeenCalled()
  })

  it('refreshes the memberships once on token_stale and replays the request', async () => {
    post.mockResolvedValue({ data: { user: sessionUser(['company-x', 'company-y']) } })
    let calls = 0
    const { api, adapter } = instanceWith((config) =>
      ++calls === 1 ? Promise.reject(stale(config)) : Promise.resolve(ok(config))
    )

    await expect(api.get('/a')).resolves.toMatchObject({ data: { company: 'company-x' } })

    expect(post).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/refresh-memberships$/),
      null,
      { withCredentials: true }
    )
    expect(adapter).toHaveBeenCalledTimes(2)
  })

  it('replays with another company when the active one was revoked', async () => {
    useAuthStore.getState().auth.setCompany({ id: 'company-y' })
    post.mockResolvedValue({ data: { user: sessionUser(['company-x']) } })
    let calls = 0
    const { api } = instanceWith((config) =>
      ++calls === 1 ? Promise.reject(stale(config)) : Promise.resolve(ok(config))
    )

    await expect(api.get('/a')).resolves.toMatchObject({ data: { company: 'company-x' } })
    expect(useAuthStore.getState().auth.company.id).toBe('company-x')
  })

  it('shares one refresh between concurrent stale requests', async () => {
    let resolveRefresh: (value: unknown) => void = () => undefined
    post.mockReturnValue(new Promise((resolve) => (resolveRefresh = resolve)))
    const seen = new Set<string>()
    const { api } = instanceWith((config) => {
      const key = config.url as string
      if (!seen.has(key)) {
        seen.add(key)
        return Promise.reject(stale(config))
      }
      return Promise.resolve(ok(config))
    })

    const pending = Promise.all([api.get('/a'), api.get('/b'), api.get('/c')])
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    resolveRefresh({ data: { user: sessionUser(['company-x']) } })

    await expect(pending).resolves.toHaveLength(3)
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('does not loop: a second token_stale after the refresh surfaces', async () => {
    post.mockResolvedValue({ data: { user: sessionUser(['company-x']) } })
    const { api, adapter } = instanceWith((config) => Promise.reject(stale(config)))

    await expect(api.get('/a')).rejects.toMatchObject({ response: { status: 401 } })
    expect(post).toHaveBeenCalledTimes(1)
    expect(adapter).toHaveBeenCalledTimes(2)
  })

  it('passes through other 401s (logged out) without refreshing', async () => {
    const { api } = instanceWith((config) =>
      Promise.reject(
        new AxiosError('unauthorized', 'ERR_BAD_REQUEST', config, null, {
          data: { statusCode: 401, message: 'Unauthorized' },
          status: 401,
          statusText: 'Unauthorized',
          headers: new AxiosHeaders(),
          config,
        })
      )
    )

    await expect(api.get('/a')).rejects.toMatchObject({ response: { status: 401 } })
    expect(post).not.toHaveBeenCalled()
  })

  it('turns the empty body of a null answer into null', async () => {
    // Nest answers `return null` with 200 and no body; axios gives `''`.
    const { api } = instanceWith((config) => Promise.resolve({ ...ok(config), data: '' }))

    await expect(api.get('/channels/whatsapp/config')).resolves.toMatchObject({ data: null })
  })

  it('keeps real bodies untouched', async () => {
    const { api } = instanceWith((config) =>
      Promise.resolve({ ...ok(config), data: 'plain text' })
    )

    await expect(api.get('/a')).resolves.toMatchObject({ data: 'plain text' })
  })
})

describe('refreshSession', () => {
  afterEach(() => {
    useAuthStore.getState().auth.reset()
    sessionStorage.clear()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('updates the store and notifies listeners (query cache) with the new session', async () => {
    const session = { user: sessionUser(['company-z']) }
    vi.spyOn(axios, 'post').mockResolvedValue({ data: session })
    const listener = vi.fn()
    const unsubscribe = onSessionRefreshed(listener)

    await refreshSession()

    expect(listener).toHaveBeenCalledWith(session)
    expect(useAuthStore.getState().auth.company.id).toBe('company-z')
    unsubscribe()
  })
})
