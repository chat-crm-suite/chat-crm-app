import { STATUS_LABEL } from '../../copy'
import type { ConversationStatus } from '../../types/chat.domain'

/**
 * Spanish copy + tint of the real statuses (`pending` = En espera, `closed` =
 * Resuelto). Shared by the list rows, the case header and the case rail: the
 * three must never disagree.
 */
export const STATUS_META: Record<
  ConversationStatus,
  { label: string; className: string; dot: string }
> = {
  open: {
    label: STATUS_LABEL.open,
    className: 'bg-primary/15 text-foreground',
    dot: 'bg-primary',
  },
  pending: {
    label: STATUS_LABEL.pending,
    className: 'bg-warning/15 text-foreground',
    dot: 'bg-warning',
  },
  closed: {
    label: STATUS_LABEL.closed,
    className: 'bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground/60',
  },
  archived: {
    label: STATUS_LABEL.archived,
    className: 'bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground/40',
  },
}
