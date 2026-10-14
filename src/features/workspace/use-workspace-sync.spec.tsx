import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  AnalyticsSocketEvent,
  WorkspaceSocketEvent,
  type TeamTableResponse,
} from '@chat-crm/contracts'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeSocket } from '@/test/fake-socket'
import { customerKeys, teamKeys } from './query-keys'
import {
  useWorkspaceSync,
  WORKSPACE_SYNC_DEBOUNCE_MS,
} from './use-workspace-sync'

const mocks = vi.hoisted(() => ({ socket: null as unknown }))

vi.mock('@/context/socket-provider', () => ({
  useSocket: () => ({ socket: mocks.socket, isConnected: true }),
}))

function Probe() {
  useWorkspaceSync()
  return null
}

const row = (id: string, state: 'available' | 'away' | 'offline') => ({
  id,
  userId: `user-${id}`,
  username: id,
  role: 'agent' as const,
  status: 'active' as const,
  acceptsAutoAssign: true,
  joinedAt: new Date('2026-01-01'),
  openConversations: 0,
  capacity: 5,
  presence: { memberId: id, state, since: new Date('2026-10-14T10:00:00Z') },
})

const page = (): TeamTableResponse => ({
  items: [row('m1', 'offline'), row('m2', 'available')],
  meta: {
    totalItems: 2,
    itemCount: 2,
    itemsPerPage: 10,
    totalPages: 1,
    currentPage: 1,
    counts: {
      byRole: { admin: 0, supervisor: 0, agent: 2 },
      byPresence: { available: 1, away: 0, offline: 1 },
    },
  },
})

const key = teamKeys.table('company-a', { page: 1 })

function setup() {
  const fake = createFakeSocket()
  mocks.socket = fake.socket
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  queryClient.setQueryData(key, page())
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const view = render(<Probe />, { wrapper })
  return { fake, queryClient, invalidate, view }
}

const invalidated = (spy: ReturnType<typeof setup>['invalidate']) =>
  spy.mock.calls.map(([filters]) => filters?.queryKey)

describe('useWorkspaceSync', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('invalidates the team family once for a burst of team:changed', () => {
    const { fake, invalidate } = setup()

    act(() => {
      fake.fire(WorkspaceSocketEvent.TeamChanged, {})
      fake.fire(WorkspaceSocketEvent.TeamChanged, {})
      vi.advanceTimersByTime(WORKSPACE_SYNC_DEBOUNCE_MS)
    })

    expect(invalidated(invalidate)).toEqual([teamKeys.root])
  })

  it('invalidates the customers family on customers:changed', () => {
    const { fake, invalidate } = setup()

    act(() => {
      fake.fire(WorkspaceSocketEvent.CustomersChanged, { customerId: 'c1' })
      vi.advanceTimersByTime(WORKSPACE_SYNC_DEBOUNCE_MS)
    })

    expect(invalidated(invalidate)).toEqual([customerKeys.root])
  })

  it('patches presence into the cached page and its counters, with no refetch', () => {
    const { fake, queryClient, invalidate } = setup()
    const since = '2026-10-14T11:00:00.000Z'

    act(() => {
      fake.fire(AnalyticsSocketEvent.PresenceChanged, {
        memberId: 'm1',
        state: 'available',
        since,
      })
    })

    const data = queryClient.getQueryData<TeamTableResponse>(key)!
    expect(data.items[0].presence.state).toBe('available')
    expect(data.items[0].presence.since).toEqual(new Date(since))
    expect(data.items[1].presence.state).toBe('available')
    expect(data.meta.counts.byPresence).toEqual({
      available: 2,
      away: 0,
      offline: 0,
    })
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('refetches the tables when the member is not on any cached page', () => {
    const { fake, invalidate } = setup()

    act(() => {
      fake.fire(AnalyticsSocketEvent.PresenceChanged, {
        memberId: 'elsewhere',
        state: 'away',
        since: '2026-10-14T11:00:00.000Z',
      })
    })

    expect(invalidated(invalidate)).toEqual([teamKeys.tables])
  })

  it('ignores malformed presence payloads and unsubscribes on unmount', () => {
    const { fake, invalidate, view } = setup()

    act(() => {
      fake.fire(AnalyticsSocketEvent.PresenceChanged, { nope: true })
    })
    expect(invalidate).not.toHaveBeenCalled()

    view.unmount()
    expect(fake.socket.off).toHaveBeenCalledTimes(3)
  })
})
