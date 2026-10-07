import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useSocket } from '@/context/socket-provider'
import { useChats } from '../../contexts/chats.provider'
import type { ChatListView } from '../../types/chat.domain'
import { Plus, SearchIcon, X } from '../icons'

const VIEWS: { id: ChatListView; label: string }[] = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'queue', label: 'Cola' },
  { id: 'needs-response', label: 'Sin resp.' },
]

const TITLES: Record<ChatListView, string> = {
  inbox: 'Inbox',
  queue: 'Sin asignar',
  'needs-response': 'Sin respuesta',
}

/**
 * Reveals the offline dot only after the flag holds: the socket is briefly
 * disconnected during the initial handshake, which must not flash a warning.
 */
function useOfflineIndicator(isConnected: boolean, delayMs = 2000) {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    if (isConnected) {
      setOffline(false)
      return
    }

    const timer = setTimeout(() => setOffline(true), delayMs)
    return () => clearTimeout(timer)
  }, [isConnected, delayMs])

  return offline
}

export const ChatListHeader = ({
  searchState,
  viewState,
  counts,
}: {
  searchState: {
    setSearch: (s: string) => void
    search: string
  }
  viewState: {
    view: ChatListView
    setView: (view: ChatListView) => void
  }
  counts: Record<ChatListView, number | undefined>
}) => {
  const { setSearchClientDialog } = useChats()
  const { isConnected } = useSocket()
  const offline = useOfflineIndicator(isConnected)

  return (
    <div
      className={cn(
        'bg-background sticky top-0 z-10 -mx-4 px-4 pb-3',
        'shadow-md sm:static sm:z-auto sm:mx-0 sm:p-0 sm:shadow-none'
      )}
    >
      <div className='flex items-center justify-between gap-2 py-2'>
        <h1 className='text-2xl font-bold'>{TITLES[viewState.view]}</h1>

        <div className='flex items-center gap-1'>
          {offline && (
            <span
              role='status'
              aria-label='Sin conexión'
              title='Sin conexión: los mensajes nuevos pueden demorar'
              className='bg-warning size-2 rounded-full'
            />
          )}
          <Button
            size='icon'
            variant='ghost'
            aria-label='Nuevo chat'
            title='Nuevo chat'
            onClick={() => {
              setSearchClientDialog(true)
            }}
            className='rounded-lg'
          >
            <Plus size={20} />
          </Button>
        </div>
      </div>

      <div
        className={cn(
          'border-border focus-within:ring-ring flex h-10 w-full items-center gap-2 rounded-md border px-2',
          'focus-within:ring-1 focus-within:outline-hidden'
        )}
      >
        <SearchIcon
          size={15}
          aria-hidden='true'
          className='text-muted-foreground shrink-0'
        />
        <input
          type='text'
          aria-label='Buscar conversación'
          className='w-full flex-1 bg-inherit text-sm focus-visible:outline-hidden'
          placeholder='Buscar conversación...'
          value={searchState.search}
          onChange={(e) => searchState.setSearch(e.target.value)}
        />
        {searchState.search !== '' && (
          <button
            type='button'
            aria-label='Limpiar búsqueda'
            onClick={() => searchState.setSearch('')}
            className={cn(
              'text-muted-foreground hover:text-foreground flex size-6 shrink-0 items-center justify-center rounded-sm',
              'focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]'
            )}
          >
            <X size={14} aria-hidden='true' />
          </button>
        )}
      </div>

      <div className='mt-2 flex gap-1' role='group' aria-label='Vistas de chats'>
        {VIEWS.map(({ id, label }) => {
          const active = viewState.view === id
          const count = counts[id]

          return (
            <Button
              key={id}
              size='sm'
              variant={active ? 'default' : 'ghost'}
              aria-pressed={active}
              className={cn(
                'h-7 flex-1 gap-1 px-1 text-xs',
                !active && 'text-muted-foreground'
              )}
              onClick={() => viewState.setView(id)}
            >
              {label}
              {count ? (
                <span className='tabular-nums opacity-70'>({count})</span>
              ) : null}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
