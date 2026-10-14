import { ChevronDown } from 'lucide-react'
import { useSocket } from '@/context/socket-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePresence } from '../hooks/use-presence'
import { PRESENCE_META } from '../lib/presence-meta'
import { PresenceIcon } from './presence-badge'

/**
 * The agent's own status. Offline is never picked by hand: it follows the
 * socket, so a dropped connection shows as such until it reconnects.
 */
export function PresenceToggle() {
  const { isConnected } = useSocket()
  const { presence, setState, isSaving } = usePresence()

  const state = !isConnected ? 'offline' : (presence?.state ?? 'available')
  const meta = PRESENCE_META[state]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='h-9 gap-2'
          disabled={!isConnected || isSaving}
          aria-label={`Tu estado: ${meta.label}. Cambiar estado`}
        >
          <PresenceIcon state={state} />
          {meta.label}
          <ChevronDown className='text-muted-foreground size-3.5' aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onSelect={() => setState('available')}>
          <PresenceIcon state='available' />
          Disponible
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setState('away')}>
          <PresenceIcon state='away' />
          Ausente
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
