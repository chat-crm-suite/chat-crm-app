/**
 * Socket error taxonomy (T6): pure helpers that turn unknown payloads into
 * toast decisions. Notifications have their own typed pipeline
 * (`features/notifications`).
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
      /** Legacy recipient; the action opens the open chat's template picker. */
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
