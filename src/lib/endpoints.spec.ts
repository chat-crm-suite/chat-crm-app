import { afterEach, describe, expect, it, vi } from 'vitest'

/** Re-evaluates the module with these build-time env values. */
const load = async (env: { api?: string; socket?: string }) => {
  vi.resetModules()
  vi.stubEnv('VITE_API_URL', env.api ?? '')
  vi.stubEnv('VITE_SOCKET_URL', env.socket ?? '')
  return import('./endpoints')
}

describe('endpoints', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('defaults to the local API when nothing is configured', async () => {
    const { API_URL, API_PUBLIC_URL, SOCKET_URL } = await load({})

    expect(API_URL).toBe('http://localhost:3000')
    expect(API_PUBLIC_URL).toBe('http://localhost:3000')
    expect(SOCKET_URL).toBe('http://localhost:3000')
  })

  it('keeps a same-origin API path relative and makes the public URL absolute', async () => {
    // Docker dev: Vite proxies /api and /socket.io to http://api:3000.
    const { API_URL, API_PUBLIC_URL, SOCKET_URL } = await load({ api: '/api' })

    expect(API_URL).toBe('/api')
    expect(API_PUBLIC_URL).toBe(`${window.location.origin}/api`)
    expect(SOCKET_URL).toBe(window.location.origin)
  })

  it('derives the socket from the API origin in production', async () => {
    const { API_URL, SOCKET_URL } = await load({ api: 'https://crm.example.io/api/' })

    expect(API_URL).toBe('https://crm.example.io/api')
    expect(SOCKET_URL).toBe('https://crm.example.io')
  })

  it('honours an explicit socket URL', async () => {
    const { SOCKET_URL } = await load({
      api: '/api',
      socket: 'https://sockets.example.io/',
    })

    expect(SOCKET_URL).toBe('https://sockets.example.io')
  })
})
