import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  AnalyticsChangedEventSchema,
  AnalyticsSocketEvent,
  IaStatusSchema,
  PresenceSchema,
  type AnalyticsScope,
} from '@chat-crm/contracts'
import { useAuthStore } from '@/stores/auth-store'
import { useSocket } from '@/context/socket-provider'
import { resourcesForScopes } from '../lib/query-keys'
import { IA_STATUS_KEY } from './use-ia-status'
import { presenceKey } from './use-presence'

/** Bursts of `analytics:changed` collapse into one refetch per resource. */
export const REALTIME_DEBOUNCE_MS = 500

/**
 * Keeps the analytics caches live without polling: `analytics:changed`
 * invalidates only the resources its scopes can touch (debounced), while
 * `ia:status:changed` and `presence:changed` carry their state and are
 * written straight into the cache. Mount once per analytics page.
 */
export function useAnalyticsRealtime(memberId: string | null) {
  const { socket } = useSocket()
  const queryClient = useQueryClient()
  const companyId = useAuthStore((state) => state.auth.company?.id ?? null)
  const pendingScopes = useRef(new Set<AnalyticsScope>())
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (!socket) return
    const pending = pendingScopes.current

    const flush = () => {
      const resources = resourcesForScopes(pending)
      pending.clear()
      for (const resource of resources) {
        void queryClient.invalidateQueries({
          queryKey: ['analytics', resource],
        })
      }
    }

    const handleChanged = (payload: unknown) => {
      const parsed = AnalyticsChangedEventSchema.safeParse(payload)
      // One socket spans every company of the session: ignore the others.
      if (!parsed.success || parsed.data.companyId !== companyId) return
      parsed.data.scopes.forEach((scope) => pending.add(scope))
      clearTimeout(timer.current)
      timer.current = setTimeout(flush, REALTIME_DEBOUNCE_MS)
    }

    const handleIaStatus = (payload: unknown) => {
      const parsed = IaStatusSchema.safeParse(payload)
      if (parsed.success) {
        queryClient.setQueryData(IA_STATUS_KEY, parsed.data)
      } else {
        void queryClient.invalidateQueries({ queryKey: IA_STATUS_KEY })
      }
    }

    const handlePresence = (payload: unknown) => {
      const parsed = PresenceSchema.safeParse(payload)
      if (parsed.success && parsed.data.memberId === memberId) {
        queryClient.setQueryData(presenceKey(companyId), parsed.data)
      }
    }

    socket.on(AnalyticsSocketEvent.Changed, handleChanged)
    socket.on(AnalyticsSocketEvent.IaStatusChanged, handleIaStatus)
    socket.on(AnalyticsSocketEvent.PresenceChanged, handlePresence)

    return () => {
      socket.off(AnalyticsSocketEvent.Changed, handleChanged)
      socket.off(AnalyticsSocketEvent.IaStatusChanged, handleIaStatus)
      socket.off(AnalyticsSocketEvent.PresenceChanged, handlePresence)
      clearTimeout(timer.current)
      pending.clear()
    }
  }, [socket, queryClient, companyId, memberId])
}
