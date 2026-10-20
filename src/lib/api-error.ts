import { AxiosError } from 'axios'

interface ApiErrorBody {
  message?: string | string[]
  title?: string
}

/** Shown when the server gave nothing a person can read. */
export const GENERIC_ERROR = 'Ocurrió un error inesperado. Inténtalo de nuevo.'
export const NETWORK_ERROR =
  'No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.'

/**
 * Extrae el mensaje de error del backend (Nest devuelve `{ message }`). Sin
 * mensaje legible cae a un texto en español: nunca un "Network Error" crudo
 * ni un 500 genérico en inglés. Errores propios de la app (no Axios) muestran
 * su mensaje.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = GENERIC_ERROR
): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorBody | undefined
    const message = data?.message ?? data?.title

    if (Array.isArray(message)) {
      const joined = message.filter(Boolean).join('. ')
      if (joined) return joined
    }
    if (typeof message === 'string' && message.trim()) return message
    if (!error.response) return NETWORK_ERROR

    return fallback
  }

  if (error instanceof Error && error.message) return error.message

  return fallback
}
