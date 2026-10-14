import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createFakeSocket } from '@/test/fake-socket'
import { AnalyticsSocketEvent } from '@chat-crm/contracts'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import { iaDisabled } from '../testing/fixtures'
import {
  REALTIME_DEBOUNCE_MS,
  useAnalyticsRealtime,
} from './use-analytics-realtime'
import { IA_STATUS_KEY } from './use-ia-status'
import { presenceKey } from './use-presence'

const mocks = vi.hoisted(() => ({ socket: null as unknown }))

vi.mock('@/context/socket-provider', () => ({
  useSocket: () => ({ socket: mocks.socket, isConnected: true }),
}))

function Probe({ memberId }: { memberId: string | null }) {
  useAnalyticsRealtime(memberId)
  return null
}

function setup() {
  const fake = createFakeSocket()
  mocks.socket = fake.socket
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  render(<Probe memberId='member-1' />, { wrapper })
  return { fake, queryClient, invalidate }
}

const invalidatedKeys = (spy: ReturnType<typeof setup>['invalidate']) =>
  spy.mock.calls.map(([filters]) => filters?.queryKey)

describe('useAnalyticsRealtime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useAuthStore.setState((state) => ({
      auth: { ...state.auth, company: { id: 'company-a' } },
    }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('collapses a burst into one refetch per touched resource, after the debounce', () => {
    const { fake, invalidate } = setup()

    act(() => {
      fake.fire(AnalyticsSocketEvent.Changed, {
        companyId: 'company-a',
        scopes: ['spend'],
      })
      fake.fire(AnalyticsSocketEvent.Changed, {
        companyId: 'company-a',
        scopes: ['spend'],
      })
    })
    expect(invalidate).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(REALTIME_DEBOUNCE_MS)
    })
    expect(invalidatedKeys(invalidate)).toEqual([['analytics', 'spend']])
  })

  it('ignores events of the other companies of the session', () => {
    const { fake, invalidate } = setup()

    act(() => {
      fake.fire(AnalyticsSocketEvent.Changed, {
        companyId: 'company-b',
        scopes: ['live'],
      })
      vi.advanceTimersByTime(REALTIME_DEBOUNCE_MS)
    })
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('writes the pushed IA status straight into the cache', () => {
    const { fake, queryClient } = setup()

    act(() => {
      fake.fire(AnalyticsSocketEvent.IaStatusChanged, iaDisabled)
    })
    expect(queryClient.getQueryData(IA_STATUS_KEY)).toEqual(iaDisabled)
  })

  it('applies presence changes of the signed-in member only', () => {
    const { fake, queryClient } = setup()
    const since = new Date('2026-10-14T10:00:00Z')

    act(() => {
      fake.fire(AnalyticsSocketEvent.PresenceChanged, {
        memberId: 'someone-else',
        state: 'away',
        since,
      })
    })
    expect(queryClient.getQueryData(presenceKey('company-a'))).toBeUndefined()

    act(() => {
      fake.fire(AnalyticsSocketEvent.PresenceChanged, {
        memberId: 'member-1',
        state: 'away',
        since,
      })
    })
    expect(queryClient.getQueryData(presenceKey('company-a'))).toMatchObject({
      state: 'away',
    })
  })
})
