import { useMutation, useQueryClient } from '@tanstack/react-query'
import { testConnection } from '@/services/whatsapp.service'
import type { ChannelType } from '@chat-crm/contracts'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { copy } from '../copy'
import { chatKeys } from '../lib/query-keys'

/** Channel types with a verification endpoint ("Reintentar verificación"). */
const VERIFIERS: Partial<Record<ChannelType, () => Promise<boolean>>> = {
  whatsapp: async () => {
    const result = await testConnection()
    if (result.sending.status !== 'ok') {
      throw new Error(result.sending.message)
    }
    return true
  },
}

export function canRetryChannel(type: ChannelType): boolean {
  return !!VERIFIERS[type]
}

/**
 * Manual re-check of a broken channel. A passing check flips it back to
 * `active` server-side and `channel:status:changed` unlocks every inbox; the
 * refetch below only covers a missed socket event.
 */
export function useChannelRetry(type: ChannelType) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => {
      const verify = VERIFIERS[type]
      if (!verify) throw new Error(copy.channelDownFallbackReason)
      return verify()
    },
    onSuccess: () => {
      toast.success(copy.channelBackToast)
      void queryClient.invalidateQueries({ queryKey: chatKeys.lists })
      void queryClient.invalidateQueries({ queryKey: chatKeys.channels })
    },
    onError: (error) =>
      toast.error(copy.channelStillDownToast, {
        description: getApiErrorMessage(error, copy.channelDownFallbackReason),
      }),
  })
}
