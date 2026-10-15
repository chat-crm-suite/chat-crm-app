import { useQuery } from '@tanstack/react-query'
import { getPlatformStatus } from '@/services/platform.service'

export const PLATFORM_STATUS_KEY = ['platform', 'status'] as const

/** Console availability + lock state (`GET /platform/status`, always 200). */
export function usePlatformStatus(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: PLATFORM_STATUS_KEY,
    queryFn: getPlatformStatus,
    enabled: options.enabled ?? true,
    staleTime: 15_000,
  })
}
