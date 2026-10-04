import { AxiosError } from 'axios'

interface ApiErrorBody {
  message?: string | string[]
}

/**
 * Extrae el mensaje de error del backend (Nest devuelve `{ message }`), con
 * fallback al mensaje del Error o a un texto genérico.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = 'Ocurrió un error inesperado'
): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorBody | undefined
    const message = data?.message

    if (Array.isArray(message)) {
      const joined = message.filter(Boolean).join('. ')
      if (joined) return joined
    }
    if (typeof message === 'string' && message.trim()) return message
  }

  if (error instanceof Error && error.message) return error.message

  return fallback
}
