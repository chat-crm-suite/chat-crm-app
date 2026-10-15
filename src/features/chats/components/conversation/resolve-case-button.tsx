import { useState } from 'react'
import { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { closeCase, getCurrentCase } from '@/services/chat.service'
import { CircleCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const caseKey = (conversationId: string) =>
  ['chat', conversationId, 'case'] as const

/**
 * Resolves the conversation's open case (feeds resolution time, resolved
 * cases and reopen metrics). If the customer writes again, the API opens a
 * new case, so resolving is never a dead end.
 */
export function ResolveCaseButton({
  conversationId,
}: {
  conversationId: string
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')

  const current = useQuery({
    queryKey: caseKey(conversationId),
    queryFn: () => getCurrentCase(conversationId),
  })

  const resolve = useMutation({
    mutationFn: () =>
      closeCase(conversationId, note.trim() ? { note: note.trim() } : {}),
    onSuccess: () => {
      toast.success('Caso resuelto.')
      setOpen(false)
      setNote('')
    },
    onError: (error) => {
      toast.error(
        error instanceof AxiosError && error.response?.status === 409
          ? 'Este caso ya estaba resuelto.'
          : 'No se pudo resolver el caso. Inténtalo de nuevo.'
      )
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: caseKey(conversationId) })
      void queryClient.invalidateQueries({ queryKey: ['chat', 'list'] })
      void queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
  })

  const isOpen = current.data?.case?.status === 'open'
  const title = isOpen
    ? 'Resolver el caso'
    : current.isPending
      ? 'Cargando el caso…'
      : 'No hay un caso abierto en esta conversación'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type='button'
          size='sm'
          className='h-11 w-11 justify-center rounded-full px-0 text-xs max-sm:hidden sm:h-8 sm:w-auto sm:px-3'
          disabled={!isOpen}
          title={title}
          aria-label={isOpen ? 'Resolver' : title}
        >
          <CircleCheck className='size-3.5' />
          <span className='desktop:inline hidden'>Resolver</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Resolver este caso?</DialogTitle>
          <DialogDescription>
            Si el cliente vuelve a escribir se abre un caso nuevo y queda
            registrado como reapertura.
          </DialogDescription>
        </DialogHeader>
        <form
          id='resolve-case-form'
          className='grid gap-2'
          onSubmit={(event) => {
            event.preventDefault()
            resolve.mutate()
          }}
        >
          <Label htmlFor='resolve-note'>Nota interna (opcional)</Label>
          <Textarea
            id='resolve-note'
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder='Qué se resolvió'
          />
        </form>
        <DialogFooter>
          <Button
            type='submit'
            form='resolve-case-form'
            disabled={resolve.isPending}
          >
            {resolve.isPending ? 'Resolviendo…' : 'Resolver caso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
