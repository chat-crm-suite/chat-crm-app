import type { ConversationStatus } from '../../types/chat.domain'

/**
 * Spanish copy for the real statuses (`closed` is the Resolve target). Shared
 * by the case rail and the case header: the rail row and the header pill must
 * never disagree.
 */
export const STATUS_META: Record<
  ConversationStatus,
  { label: string; className: string }
> = {
  open: { label: 'Abierto', className: 'bg-primary/15 text-foreground' },
  pending: { label: 'Pendiente', className: 'bg-chart-2/15 text-chart-2' },
  closed: { label: 'Resuelto', className: 'bg-muted text-muted-foreground' },
  archived: { label: 'Archivado', className: 'bg-muted text-muted-foreground' },
}
