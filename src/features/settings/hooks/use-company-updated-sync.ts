import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { WorkspaceSocketEvent } from '@chat-crm/contracts'
import { useSocket } from '@/context/socket-provider'
import { refreshSession } from '@/lib/http'

/**
 * `company:updated` means someone edited the company (name, timezone,
 * assignment rules…). Refetch the company queries and refresh the memberships
 * so the switcher shows the new name. One socket serves every company, so the
 * ping is handled without looking at which one it was.
 */
export function useCompanyUpdatedSync(): void {
  const { socket } = useSocket()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!socket) return

    const onCompanyUpdated = () => {
      void queryClient.invalidateQueries({ queryKey: ['company'] })
      void refreshSession().catch(() => undefined)
    }

    socket.on(WorkspaceSocketEvent.CompanyUpdated, onCompanyUpdated)
    return () => {
      socket.off(WorkspaceSocketEvent.CompanyUpdated, onCompanyUpdated)
    }
  }, [socket, queryClient])
}
