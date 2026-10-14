import type { PresenceState } from '@chat-crm/contracts'
import { Circle, CircleDashed, CircleDot } from 'lucide-react'

/** Shape + label carry the state; color only reinforces it. */
export const PRESENCE_META: Record<
  PresenceState,
  { label: string; icon: typeof Circle; className: string }
> = {
  available: {
    label: 'Disponible',
    icon: CircleDot,
    className: 'text-sla-ok',
  },
  away: {
    label: 'Ausente',
    icon: CircleDashed,
    className: 'text-sla-risk',
  },
  offline: {
    label: 'Desconectado',
    icon: Circle,
    className: 'text-muted-foreground',
  },
}
