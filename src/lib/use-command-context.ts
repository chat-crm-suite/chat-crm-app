import { useMemo } from 'react'
import { useMemberRole } from '@/hooks/use-member-role'
import { useAuthStore } from '@/stores/auth-store'
import type { CommandContext } from './commands'

/**
 * Context the command registry filters by: the role in the active company and
 * the platform-admin flag. `platformUnlocked` is passed in by callers that
 * already know it (the command menu), since only they query the status.
 */
export function useCommandContext(platformUnlocked?: boolean): CommandContext {
  const { role } = useMemberRole()
  const isPlatformAdmin = useAuthStore(
    (state) => state.auth.user?.isPlatformAdmin ?? false
  )

  return useMemo(
    () => ({ role, isPlatformAdmin, platformUnlocked }),
    [role, isPlatformAdmin, platformUnlocked]
  )
}
