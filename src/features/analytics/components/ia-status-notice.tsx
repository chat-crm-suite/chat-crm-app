import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { toggleIa } from '../clients/ia.client'
import { IA_STATUS_KEY, type IaAvailability } from '../hooks/use-ia-status'

type IaStatusNoticeProps = {
  ia: IaAvailability
  isAdmin: boolean
}

/**
 * Explains why tone metrics are missing. Disabled (kill switch) offers the
 * admin a way back; unavailable (IA down) says they return on their own.
 * Renders nothing while the IA is active or its status is still loading.
 */
export function IaStatusNotice({ ia, isAdmin }: IaStatusNoticeProps) {
  const queryClient = useQueryClient()
  const enable = useMutation({
    mutationFn: () => toggleIa(true),
    onSuccess: () => {
      toast.success('Análisis de sentimiento activado.')
      void queryClient.invalidateQueries({ queryKey: IA_STATUS_KEY })
    },
    onError: () =>
      toast.error('No se pudo activar el análisis de sentimiento.'),
  })

  if (ia.isPending || ia.available || !ia.status) return null

  const disabled = ia.status.status === 'disabled'

  return (
    <div
      role='status'
      className='bg-muted/50 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-4 py-3 text-sm'
    >
      <Info className='text-muted-foreground size-4 shrink-0' aria-hidden />
      <p className='min-w-0 flex-1'>
        {disabled
          ? 'El análisis de sentimiento está desactivado, así que las métricas de tono no se muestran.'
          : 'El análisis de sentimiento no está disponible ahora mismo. Las métricas de tono vuelven solas cuando el servicio se recupere.'}
      </p>
      {disabled && isAdmin && (
        <Button
          size='sm'
          variant='outline'
          className='h-8'
          disabled={enable.isPending}
          onClick={() => enable.mutate()}
        >
          {enable.isPending ? 'Activando…' : 'Activar análisis'}
        </Button>
      )}
    </div>
  )
}
