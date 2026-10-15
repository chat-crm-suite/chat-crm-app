import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { PlatformStatus } from '@chat-crm/contracts'
import { toast } from 'sonner'
import { onPlatformLocked } from '@/services/platform.service'
import { PLATFORM_COPY } from '../copy'
import { PLATFORM_STATUS_KEY } from './use-platform-status'

/**
 * Any console request can answer `platform_locked` once the 30-minute token is
 * gone. The status flips to locked, which swaps the screen back to the unlock
 * form without a navigation (so nothing typed elsewhere is lost).
 */
export function usePlatformLockSync(): void {
  const queryClient = useQueryClient()

  useEffect(
    () =>
      onPlatformLocked(() => {
        queryClient.setQueryData<PlatformStatus>(PLATFORM_STATUS_KEY, {
          enabled: true,
          unlocked: false,
        })
        toast.warning(PLATFORM_COPY.relocked)
      }),
    [queryClient]
  )
}
