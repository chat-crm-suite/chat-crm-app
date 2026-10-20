import type { Mutation } from '@tanstack/react-query'
import { notify } from './notify'

/**
 * Spread into `useMutation` when every caller toasts its own error (usually
 * `mutateAsync` in a try/catch): the global fallback then stays quiet.
 */
export const SCREEN_HANDLES_ERRORS = { meta: { toast: false } } as const

/** Stable id: a burst of failing mutations shows one toast, not a stack. */
export const SERVER_ERROR_TOAST_ID = 'server-error'

/**
 * Global fallback for failed mutations. It only speaks when nobody else does:
 * a mutation with its own `onError`, or tagged `meta: { toast: false }`
 * because its screen already toasts (also via `mutate(x, { onError })`), is
 * left alone, so a failure never shows two toasts.
 */
export function handleMutationError(
  error: unknown,
  mutation: Pick<
    Mutation<unknown, unknown, unknown, unknown>,
    'meta' | 'options'
  >
): void {
  if (mutation.meta?.toast === false) return
  if (mutation.options.onError) return

  notify.apiError(error, undefined, { id: SERVER_ERROR_TOAST_ID })
}
