import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ManualPresenceState } from '@chat-crm/contracts'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { getMyPresence, updatePresence } from '../clients/presence.client'

export const presenceKey = (companyId: string | null) =>
  ['presence', 'me', companyId] as const

/** The member's own presence (REST + `presence:changed` via realtime). */
export function usePresence() {
  const companyId = useAuthStore((state) => state.auth.company?.id ?? null)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: presenceKey(companyId),
    queryFn: getMyPresence,
    enabled: !!companyId,
    staleTime: 60_000,
  })

  const mutation = useMutation({
    mutationFn: (state: ManualPresenceState) => updatePresence(state),
    onSuccess: (presence) => {
      queryClient.setQueryData(presenceKey(companyId), presence)
    },
    onError: () => {
      toast.error('No se pudo cambiar tu estado. Inténtalo de nuevo.')
    },
  })

  return {
    presence: query.data,
    isPending: query.isPending,
    setState: mutation.mutate,
    isSaving: mutation.isPending,
  }
}
