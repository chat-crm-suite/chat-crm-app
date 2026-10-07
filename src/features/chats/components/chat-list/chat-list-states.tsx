import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { ChatListView } from '../../types/chat.domain'
import { CloudOff, MessageSquareText, RefreshCw, SearchX } from '../icons'

/** Loading: placeholder rows shaped like a real item (no spinner). */
export const ChatListSkeleton = ({ rows = 6 }: { rows?: number }) => (
  <div aria-busy='true' aria-label='Cargando chats' className='flex flex-col gap-1'>
    {Array.from({ length: rows }, (_, index) => (
      <div key={index} className='flex items-start gap-2 px-2 py-2'>
        <Skeleton className='size-9 shrink-0 rounded-full' />
        <div className='flex-1 space-y-1.5 pt-0.5'>
          <Skeleton className='h-3.5 w-2/3' />
          <Skeleton className='h-3 w-full' />
        </div>
      </div>
    ))}
  </div>
)

const EmptyShell = ({ children }: { children: ReactNode }) => (
  <div className='flex flex-col items-center gap-1.5 px-6 py-10 text-center'>
    <span className='bg-muted mb-1 flex size-9 items-center justify-center rounded-full'>
      <MessageSquareText
        aria-hidden='true'
        className='text-muted-foreground size-4'
      />
    </span>
    {children}
  </div>
)

/** Error: says what failed and offers the retry the user can act on. */
export const ChatListError = ({ onRetry }: { onRetry: () => void }) => (
  <div className='flex flex-col items-center gap-1.5 px-6 py-10 text-center'>
    <span className='bg-muted mb-1 flex size-9 items-center justify-center rounded-full'>
      <CloudOff aria-hidden='true' className='text-muted-foreground size-4' />
    </span>
    <p className='text-sm font-medium'>No se pudieron cargar los chats</p>
    <p className='text-muted-foreground text-xs'>
      Revisá tu conexión e intentá de nuevo.
    </p>
    <Button size='xs' variant='outline' className='mt-1' onClick={onRetry}>
      <RefreshCw aria-hidden='true' />
      Reintentar
    </Button>
  </div>
)

const EMPTY_COPY: Record<ChatListView, { title: string; hint: string }> = {
  inbox: {
    title: 'No hay chats activos',
    hint: 'Cuando un cliente escriba, aparece acá.',
  },
  queue: {
    title: 'No hay chats sin asignar',
    hint: 'Las conversaciones nuevas aparecen acá para reclamar.',
  },
  'needs-response': {
    title: 'Sin pendientes por responder',
    hint: 'Cuando un chat espere respuesta, aparece acá.',
  },
}

/** Empty: teaches when the list fills up again, not just that it is empty. */
export const ChatListEmpty = ({
  view,
  search,
  onClearSearch,
}: {
  view: ChatListView
  search: string
  onClearSearch: () => void
}) => {
  if (search !== '') {
    return (
      <div className='flex flex-col items-center gap-1.5 px-6 py-10 text-center'>
        <span className='bg-muted mb-1 flex size-9 items-center justify-center rounded-full'>
          <SearchX aria-hidden='true' className='text-muted-foreground size-4' />
        </span>
        <p className='text-sm font-medium'>
          Ningún chat coincide con “{search}”
        </p>
        <Button
          size='xs'
          variant='outline'
          className='mt-1'
          onClick={onClearSearch}
        >
          Limpiar búsqueda
        </Button>
      </div>
    )
  }

  const copy = EMPTY_COPY[view]

  return (
    <EmptyShell>
      <p className='text-sm font-medium'>{copy.title}</p>
      <p className='text-muted-foreground text-xs'>{copy.hint}</p>
    </EmptyShell>
  )
}
