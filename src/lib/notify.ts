import { toast, type ExternalToast } from 'sonner'
import { getApiErrorMessage } from './api-error'

/**
 * The app's single toast API (over sonner). Screens call `notify.*` instead of
 * `toast` so every toast follows the same rules:
 *
 * - Spanish copy, never `undefined` nor a raw "Network Error"
 *   (`getApiErrorMessage`);
 * - a stable `id` when the same thing can fire twice (sonner then updates the
 *   visible toast instead of stacking a copy);
 * - errors stay a bit longer than confirmations, critical ones until closed.
 */
export type NotifyOptions = Pick<
  ExternalToast,
  'id' | 'description' | 'action' | 'duration' | 'icon' | 'onDismiss'
>

const ERROR_DURATION_MS = 7000

export const notify = {
  success: (message: string, options?: NotifyOptions) =>
    toast.success(message, options),

  info: (message: string, options?: NotifyOptions) =>
    toast.info(message, options),

  warning: (message: string, options?: NotifyOptions) =>
    toast.warning(message, options),

  error: (message: string, options?: NotifyOptions) =>
    toast.error(message, { duration: ERROR_DURATION_MS, ...options }),

  /** Critical: stays until the person closes it or acts on it. */
  critical: (message: string, options?: NotifyOptions) =>
    toast.error(message, { duration: Infinity, closeButton: true, ...options }),

  /** An API failure as one readable error toast. */
  apiError: (error: unknown, fallback?: string, options?: NotifyOptions) =>
    toast.error(getApiErrorMessage(error, fallback), {
      duration: ERROR_DURATION_MS,
      ...options,
    }),

  dismiss: (id?: string | number) => toast.dismiss(id),
}
