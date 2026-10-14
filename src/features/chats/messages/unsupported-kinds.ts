import type { MessageType } from '@chat-crm/contracts'
import {
  Contact,
  LayoutTemplate,
  MapPin,
  MessageSquareMore,
  MousePointerClick,
  SmilePlus,
  type LucideIcon,
} from 'lucide-react'

/** Names of the kinds the thread does not render yet. */
export const UNSUPPORTED_KINDS: Partial<
  Record<MessageType, { label: string; icon: LucideIcon }>
> = {
  location: { label: 'Ubicación', icon: MapPin },
  contact: { label: 'Contacto', icon: Contact },
  reaction: { label: 'Reacción', icon: SmilePlus },
  template: { label: 'Plantilla', icon: LayoutTemplate },
  interactive: { label: 'Mensaje interactivo', icon: MousePointerClick },
}

export function unsupportedKind(type: MessageType) {
  return UNSUPPORTED_KINDS[type] ?? { label: 'Mensaje', icon: MessageSquareMore }
}
