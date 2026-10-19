import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import type { ErrorComponentProps } from '@tanstack/react-router'

import { isApiUp } from '@/lib/http'
import { RouteError } from './route-error'
import {
  SERVER_POLL_INTERVAL_MS,
  ServerUnavailable,
} from './server-unavailable'

vi.mock('@/lib/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/http')>()),
  isApiUp: vi.fn(),
}))

const invalidate = vi.fn()
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouter: () => ({ invalidate, history: { go: vi.fn() } }),
  useNavigate: () => vi.fn(),
}))

const isApiUpMock = vi.mocked(isApiUp)

/** Lets the pending probe resolve and React apply its state. */
const tick = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(SERVER_POLL_INTERVAL_MS)
  })
}

describe('ServerUnavailable', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })
  afterEach(() => vi.useRealTimers())

  it('says it is waiting for the server instead of showing a 500', () => {
    isApiUpMock.mockResolvedValue(false)
    render(<ServerUnavailable onReconnect={vi.fn()} />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'Conectando con el servidor…'
    )
    expect(screen.queryByText('500')).not.toBeInTheDocument()
  })

  it('keeps probing while the API is down and reconnects once it answers', async () => {
    const onReconnect = vi.fn()
    isApiUpMock
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
    render(<ServerUnavailable onReconnect={onReconnect} />)

    await tick()
    await tick()
    expect(onReconnect).not.toHaveBeenCalled()
    expect(screen.getByText('Intentos: 2')).toBeInTheDocument()

    await tick()
    expect(isApiUpMock).toHaveBeenCalledTimes(3)
    expect(onReconnect).toHaveBeenCalledTimes(1)
  })

  it('stops probing once unmounted', async () => {
    isApiUpMock.mockResolvedValue(false)
    const { unmount } = render(<ServerUnavailable onReconnect={vi.fn()} />)

    await tick()
    unmount()
    await tick()
    await tick()

    expect(isApiUpMock).toHaveBeenCalledTimes(1)
  })

  it('retries right away from the button', () => {
    const onReconnect = vi.fn()
    isApiUpMock.mockResolvedValue(false)
    render(<ServerUnavailable onReconnect={onReconnect} />)

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar ahora' }))

    expect(onReconnect).toHaveBeenCalledTimes(1)
  })
})

describe('RouteError', () => {
  const props = (error: unknown) =>
    ({ error, reset: vi.fn(), info: undefined }) as unknown as ErrorComponentProps

  beforeEach(() => {
    vi.clearAllMocks()
    isApiUpMock.mockResolvedValue(false)
  })

  it('waits for the server when the API did not answer', () => {
    render(<RouteError {...props(new AxiosError('Network Error', 'ERR_NETWORK'))} />)

    expect(screen.getByText('Conectando con el servidor…')).toBeInTheDocument()
  })

  it('re-runs the routes when reconnecting', () => {
    render(<RouteError {...props(new AxiosError('Network Error', 'ERR_NETWORK'))} />)

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar ahora' }))

    expect(invalidate).toHaveBeenCalledTimes(1)
  })

  it('keeps the 500 page for a real server error', () => {
    const config = { headers: new AxiosHeaders() }
    const http500 = new AxiosError('boom', 'ERR_BAD_RESPONSE', config, null, {
      data: {},
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
      config,
    })
    render(<RouteError {...props(http500)} />)

    expect(screen.getByText('500')).toBeInTheDocument()
    expect(screen.queryByText('Conectando con el servidor…')).not.toBeInTheDocument()
  })

  it('keeps the 500 page for a crash in the app', () => {
    render(<RouteError {...props(new TypeError('x is undefined'))} />)

    expect(screen.getByText('500')).toBeInTheDocument()
  })
})
