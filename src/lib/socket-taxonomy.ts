/**
 * Pure decision helpers for the socket error/notification taxonomy (T6).
 *
 * The components stay thin: they only translate these decisions into toasts.
 * Payloads are `unknown` on purpose: the API emits legacy shapes too, and a
 * malformed payload must never crash the socket listener.
 */

export type ErrorToastDecision =
  | {
      kind: 'template'
      title: string
      description?: string
      /** Legacy recipient for `sendTemplate`. */
      recipient?: string
    }
  | {
      kind: 'detail'
      title: string
      description?: string
    }

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null
}

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

/**
 * `conversation:message:error` decision.
 *
 * The v2 payload (`WhatsappNotificationError`: code/title/message/error_data)
 * carries no message reference, so this only decides the toast: the inline
 * `failed` state comes from the `conversation:message:status` patch (T3).
 * `hasAction` (legacy shape) is the only signal for the "Enviar plantilla"
 * action; anything else falls back to the detail toast.
 */
export function resolveErrorToast(error: unknown): ErrorToastDecision {
  const raw = asRecord(error)
  const title = asText(raw?.title) ?? asText(raw?.type)
  const message = asText(raw?.message)
  const details = asText(asRecord(raw?.error_data)?.details) ?? message

  if (raw?.hasAction === true) {
    return {
      kind: 'template',
      title: title ?? 'Error al enviar el mensaje',
      description: message,
      recipient: asText(raw?.to),
    }
  }

  return {
    kind: 'detail',
    title: title ?? 'Error al enviar el mensaje',
    description: details,
  }
}

export interface NotificationToastPayload {
  title: string
  body?: string
}

/**
 * `notification:new` decision: one title/body pair for the browser
 * notification and the single toast (the bell cache keeps the raw payload).
 */
export function notificationToastPayload(
  notification: unknown
): NotificationToastPayload {
  const raw = asRecord(notification)

  return {
    title: asText(raw?.title) ?? 'Nuevo mensaje',
    body: asText(raw?.body),
  }
}

/**
 * Prepends a live notification to the bell cache. Unknown caches start a new
 * list; a redelivered notification (same id) replaces its row instead of
 * duplicating it.
 */
export function prependNotification(
  previous: unknown,
  notification: unknown
): unknown[] {
  const list = Array.isArray(previous) ? previous : []
  const incomingId = asText(asRecord(notification)?.id)

  const rest = incomingId
    ? list.filter((item) => asText(asRecord(item)?.id) !== incomingId)
    : list

  return [notification, ...rest]
}

export type AssignmentEvent = 'assigned' | 'unassigned'

export interface AssignmentToastDecision {
  type: 'success' | 'info'
  title: string
  description?: string
  /** Stable Sonner id: the local mutation and the socket echo collapse. */
  id?: string
}

export interface AssignmentToastContext {
  /** True when this client initiated the assignment (claim/self-assign). */
  isSelfInitiated?: (conversationId: string) => boolean
}

export function assignmentToastId(conversationId: string): string {
  return `assignment:${conversationId}`
}

/**
 * `conversation:assigned` / `conversation:unassigned` decision. The list
 * invalidation is not decided here: the handler always refreshes, and only
 * the `assigned` toast is silenced when the event echoes this client's own
 * claim/self-assign (the mutation already toasted). Unassigned has no local
 * action, so it always toasts.
 */
export function resolveAssignmentToast(
  event: AssignmentEvent,
  payload: unknown,
  context: AssignmentToastContext = {}
): AssignmentToastDecision | null {
  const conversationId = asText(asRecord(payload)?.conversationId)

  if (
    event === 'assigned' &&
    conversationId &&
    context.isSelfInitiated?.(conversationId)
  ) {
    return null
  }

  const id = conversationId ? assignmentToastId(conversationId) : undefined

  if (event === 'assigned') {
    return { type: 'success', title: 'Chat asignado a tu nombre', id }
  }

  return {
    type: 'info',
    title: 'Chat sin asignar',
    description: 'Hay un chat esperando agente en la cola',
    id,
  }
}

const selfInitiatedAssignments = new Set<string>()

/**
 * Marks a conversation this client is assigning itself (claim/self-assign)
 * before the request leaves, so the socket echo never doubles the mutation
 * toast. `consumeSelfInitiatedAssignment` reads and clears it when the echo
 * arrives; `clearSelfInitiatedAssignment` drops it when the action fails.
 */
export function markSelfInitiatedAssignment(conversationId: string): void {
  selfInitiatedAssignments.add(conversationId)
}

export function consumeSelfInitiatedAssignment(
  conversationId: string
): boolean {
  return selfInitiatedAssignments.delete(conversationId)
}

export function clearSelfInitiatedAssignment(conversationId: string): void {
  selfInitiatedAssignments.delete(conversationId)
}
