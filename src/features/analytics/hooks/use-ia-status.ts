import { useQuery } from '@tanstack/react-query'
import type { IaStatus } from '@chat-crm/contracts'
import { getIaStatus } from '../clients/ia.client'

/** Global, not per company: the kill switch and breaker are server-wide. */
export const IA_STATUS_KEY = ['ia', 'status'] as const

export type IaAvailability = {
  status: IaStatus | undefined
  /** Sentiment features render only while this is true. */
  available: boolean
  isPending: boolean
}

/**
 * Sentiment IA status (REST + `ia:status:changed` via the realtime hook).
 * While unknown or unreadable it counts as unavailable, so tone widgets never
 * mount just to hit the 409 the API answers when the IA is off.
 */
export function useIaStatus(): IaAvailability {
  const query = useQuery({
    queryKey: IA_STATUS_KEY,
    queryFn: getIaStatus,
    staleTime: 60_000,
  })

  return {
    status: query.data,
    available: query.data?.available ?? false,
    isPending: query.isPending,
  }
}
