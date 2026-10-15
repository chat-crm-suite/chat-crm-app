// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

import { authenticatedFetch, login, resolveCredentials } from './contracts-auth.mjs'

afterEach(() => {
  delete process.env.API_USERNAME
  delete process.env.API_PASSWORD
  vi.restoreAllMocks()
})

describe('resolveCredentials', () => {
  it('reads short flags', () => {
    expect(resolveCredentials(['node', 'x', '-u', 'alice', '-p', 's3cret'])).toEqual({
      username: 'alice',
      password: 's3cret',
    })
  })

  it('reads long flags', () => {
    expect(resolveCredentials(['--username', 'bob', '--password', 'pw'])).toEqual({
      username: 'bob',
      password: 'pw',
    })
  })

  it('falls back to env vars', () => {
    process.env.API_USERNAME = 'env-user'
    process.env.API_PASSWORD = 'env-pass'
    expect(resolveCredentials(['node'])).toEqual({
      username: 'env-user',
      password: 'env-pass',
    })
  })

  it('prefers flags over env', () => {
    process.env.API_USERNAME = 'env-user'
    expect(resolveCredentials(['-u', 'flag-user']).username).toBe('flag-user')
  })

  it('returns nulls when nothing is provided', () => {
    expect(resolveCredentials(['node'])).toEqual({ username: null, password: null })
  })
})

describe('login', () => {
  it('posts credentials and returns the access_token cookie pair', async () => {
    const fetchMock = vi.fn(async (url, options) => {
      expect(url).toBe('http://api.test/auth/login')
      expect(JSON.parse(options.body)).toEqual({ username: 'alice', password: 'pw' })
      return new Response('{"message":"Login Success"}', {
        status: 200,
        headers: { 'set-cookie': 'access_token=jwt.value.here; Path=/; HttpOnly; SameSite=Lax' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    expect(await login('http://api.test/', 'alice', 'pw')).toBe('access_token=jwt.value.here')
  })

  it('throws on a non-2xx login', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })))
    await expect(login('http://api.test', 'alice', 'bad')).rejects.toThrow('login -> HTTP 401')
  })

  it('throws when no cookie is returned', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })))
    await expect(login('http://api.test', 'alice', 'pw')).rejects.toThrow(
      'did not return a session cookie',
    )
  })
})

describe('authenticatedFetch', () => {
  it('sends the session cookie', async () => {
    const fetchMock = vi.fn(async (url, options) => {
      expect(url).toBe('http://api.test/contracts/manifest')
      expect(options.headers.cookie).toBe('access_token=jwt')
      return new Response('{}', { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    await authenticatedFetch('http://api.test/', '/contracts/manifest', 'access_token=jwt')
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
