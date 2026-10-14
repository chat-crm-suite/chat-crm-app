import { AxiosError } from 'axios'

/**
 * Machine-readable `code` of an API error body (`{ code, message }`), when
 * the endpoint sent one. The HTTP status is returned alongside so callers can
 * tell a 409 conflict from a 403.
 */
export function getApiError(error: unknown): {
  status?: number
  code?: string
  data?: Record<string, unknown>
} {
  if (!(error instanceof AxiosError)) return {}

  const data = error.response?.data as Record<string, unknown> | undefined
  return {
    status: error.response?.status,
    code: typeof data?.code === 'string' ? data.code : undefined,
    data,
  }
}
