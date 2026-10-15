import { useEffect } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  AnalyticsSocketEvent,
  PresenceSchema,
  WorkspaceSocketEvent,
  type Presence,
  type TeamTableResponse,
} from '@chat-crm/contracts'
import { useSocket } from '@/context/socket-provider'
import { customerKeys, teamKeys } from './query-keys'

/** Bursts of pings (an import, a bulk delete) collapse into one refetch. */
export const WORKSPACE_SYNC_DEBOUNCE_MS = 300

/**
 * Writes a presence change into every cached Equipo page without refetching:
 * the member's dot, and the company-wide counters behind the header chips.
 * When the member is on none of the cached pages (another page, another
 * filter) only the counters changed, so the tables are refetched once.
 */
export function applyPresence(queryClient: QueryClient, presence: Presence) {
  const cached = queryClient.getQueriesData<TeamTableResponse>({
    queryKey: teamKeys.tables,
  })

  const previous = cached
    .flatMap(([, data]) => data?.items ?? [])
    .find((member) => member.id === presence.memberId)?.presence.state

  if (!previous) {
    if (cached.length > 0) {
      void queryClient.invalidateQueries({ queryKey: teamKeys.tables })
    }
    return
  }

  for (const [key, data] of cached) {
    if (!data) continue

    const counts = data.meta.counts.byPresence
    queryClient.setQueryData<TeamTableResponse>(key, {
      ...data,
      items: data.items.map((member) =>
        member.id === presence.memberId ? { ...member, presence } : member
      ),
      meta: {
        ...data.meta,
        counts: {
          ...data.meta.counts,
          byPresence:
            previous === presence.state
              ? counts
              : {
                  ...counts,
                  [previous]: Math.max(0, counts[previous] - 1),
                  [presence.state]: counts[presence.state] + 1,
                },
        },
      },
    })
  }
}

/**
 * Keeps Equipo and Clientes live: `team:changed` / `customers:changed` are
 * invalidation pings (debounced), and `presence:changed` is patched straight
 * into the cached team pages. Mount once per data screen.
 */
export function useWorkspaceSync() {
  const { socket } = useSocket()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!socket) return

    const timers = new Map<string, ReturnType<typeof setTimeout>>()
    const debouncedInvalidate = (root: readonly unknown[]) => {
      const id = String(root[0])
      clearTimeout(timers.get(id))
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id)
          void queryClient.invalidateQueries({ queryKey: root })
        }, WORKSPACE_SYNC_DEBOUNCE_MS)
      )
    }

    const onTeam = () => debouncedInvalidate(teamKeys.root)
    const onCustomers = () => debouncedInvalidate(customerKeys.root)
    const onPresence = (payload: unknown) => {
      const parsed = PresenceSchema.safeParse(payload)
      if (parsed.success) applyPresence(queryClient, parsed.data)
    }

    socket.on(WorkspaceSocketEvent.TeamChanged, onTeam)
    socket.on(WorkspaceSocketEvent.CustomersChanged, onCustomers)
    socket.on(AnalyticsSocketEvent.PresenceChanged, onPresence)

    return () => {
      socket.off(WorkspaceSocketEvent.TeamChanged, onTeam)
      socket.off(WorkspaceSocketEvent.CustomersChanged, onCustomers)
      socket.off(AnalyticsSocketEvent.PresenceChanged, onPresence)
      timers.forEach(clearTimeout)
    }
  }, [socket, queryClient])
}
