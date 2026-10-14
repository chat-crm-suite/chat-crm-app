import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { WorkspaceSocketEvent } from '@chat-crm/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeSocket } from '@/test/fake-socket'
import { newQueryClient } from '../testing/fixtures'
import { useCompanyUpdatedSync } from './use-company-updated-sync'

const mocks = vi.hoisted(() => ({
  socket: null as unknown,
  refreshSession: vi.fn(),
}))

vi.mock('@/context/socket-provider', () => ({
  useSocket: () => ({ socket: mocks.socket, isConnected: true }),
}))
vi.mock('@/lib/http', () => ({ refreshSession: mocks.refreshSession }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.refreshSession.mockResolvedValue({})
})

function setup() {
  const fake = createFakeSocket()
  mocks.socket = fake.socket
  const queryClient = newQueryClient()
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const hook = renderHook(() => useCompanyUpdatedSync(), { wrapper })
  return { ...fake, invalidate, hook }
}

describe('useCompanyUpdatedSync', () => {
  it('refetches the company queries and the memberships on company:updated', () => {
    const { fire, invalidate } = setup()

    fire(WorkspaceSocketEvent.CompanyUpdated, { companyId: 'c1' })

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['company'] })
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1)
  })

  it('survives a failed membership refresh', async () => {
    mocks.refreshSession.mockRejectedValue(new Error('offline'))
    const { fire } = setup()

    expect(() => fire(WorkspaceSocketEvent.CompanyUpdated)).not.toThrow()
    await Promise.resolve()
  })

  it('stops listening on unmount', () => {
    const { socket, hook } = setup()

    hook.unmount()

    expect(socket.off).toHaveBeenCalledWith(
      WorkspaceSocketEvent.CompanyUpdated,
      expect.any(Function)
    )
  })

  it('does nothing while the socket is not ready', () => {
    mocks.socket = null
    const queryClient = newQueryClient()
    expect(() =>
      renderHook(() => useCompanyUpdatedSync(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      })
    ).not.toThrow()
  })
})
