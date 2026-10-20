import { useEffect, useState } from 'react'
import { Unplug } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSocket } from '@/context/socket-provider'
import { Button } from '@/components/ui/button'
import { useChats } from '../../contexts/chats.context'
import { LIST_VIEW_LABEL, LIST_VIEW_TITLE, copy } from '../../copy'
import type { ChannelHealth } from '../../lib/channel-health'
import type { ChatListView } from '../../types/chat.domain'
import { PANE_HEADER } from '../conversation/case-header'
import { Plus, SearchIcon, X } from '../icons'

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
  views,
  counts,
  channelDown,
}: {
  searchState: {
    setSearch: (s: string) => void
    search: string
  }
  viewState: {
    view: ChatListView
    setView: (view: ChatListView) => void
  }
  /** Tabs this member may see (`all` only for admins and supervisors). */
  views: readonly ChatListView[]
  counts: Partial<Record<ChatListView, number | undefined>>
  /** A listed conversation's channel is down (shown next to the offline dot). */
  channelDown?: ChannelHealth | null
}) => {
  const { setSearchClientDialog } = useChats()
  const { isConnected } = useSocket()
  const offline = useOfflineIndicator(isConnected)

  return (
    <div className='flex-none'>
      <div
        className={cn(
          PANE_HEADER,
          'flex items-center justify-between gap-2 ps-4 pe-2'
        )}
      >
        <h1 className='truncate text-base font-semibold'>
          {LIST_VIEW_TITLE[viewState.view]}
        </h1>

        <div className='flex items-center gap-1'>
          {channelDown && (
            <span
              role='status'
              aria-label={copy.channelDownTitle(channelDown.name)}
              title={`${copy.channelDownTitle(channelDown.name)}: ${channelDown.reason}`}
              className='text-destructive bg-destructive/10 flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-medium'
            >
              <Unplug className='size-3' aria-hidden />
              <span className='max-sm:sr-only'>{copy.channelOffline}</span>
            </span>
          )}
          {offline && (
            <span
              role='status'
              aria-label={copy.offline}
              title={copy.offlineHint}
              className='bg-warning size-2 rounded-full'
            />
          )}
          <Button
            size='icon'
            variant='ghost'
            aria-label={copy.newChat}
            title={copy.newChat}
            onClick={() => setSearchClientDialog(true)}
            className='size-11 rounded-lg sm:size-9'
          >
            <Plus size={20} />
          </Button>
        </div>
      </div>

      <div className='space-y-2 border-b p-3'>
        <div
          className={cn(
            'border-input focus-within:ring-ring/50 flex h-11 w-full items-center gap-2 rounded-md border px-2 sm:h-9',
            'focus-within:ring-[3px] focus-within:outline-hidden'
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
            placeholder={copy.searchConversation}
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

        <div
          className='bg-muted/60 flex gap-0.5 rounded-lg p-0.5'
          role='group'
          aria-label='Vistas de chats'
        >
          {views.map((id) => {
            const active = viewState.view === id
            const count = counts[id]

            return (
              <button
                key={id}
                type='button'
                aria-pressed={active}
                className={cn(
                  'flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-1 text-xs font-medium sm:h-7',
                  'focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]',
                  active
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => viewState.setView(id)}
              >
                <span className='truncate'>{LIST_VIEW_LABEL[id]}</span>
                {count ? (
                  <span className='tabular-nums opacity-70'>{count}</span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
