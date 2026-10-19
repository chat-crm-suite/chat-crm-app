import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'
import {
  AUTH_ERROR_CODES,
  COMPANY_HEADER,
  type AuthSessionResponse,
} from '@chat-crm/contracts'
import { useAuthStore } from '@/stores/auth-store'
import { API_URL, HEALTH_PATH } from './endpoints'

export { API_PUBLIC_URL, API_URL, HEALTH_PATH, SOCKET_URL } from './endpoints'

/**
 * True when the API did not answer at all (down, still booting, restarting):
 * the request never got a response. An HTTP error (4xx/5xx) is NOT one.
 */
export function isNetworkError(error: unknown): boolean {
  return error instanceof AxiosError && !error.response
}

/** `GET /health` without the tenant interceptors: does the API answer? */
export async function isApiUp(signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}${HEALTH_PATH}`, {
      cache: 'no-store',
      signal,
    })
    return response.ok
  } catch {
    return false
  }
}

type SessionListener = (session: AuthSessionResponse) => void

const sessionListeners = new Set<SessionListener>()

/**
 * Notified after the session memberships were refreshed (e.g. to update the
 * `['auth', 'me']` query cache). Returns the unsubscribe function.
 */
export function onSessionRefreshed(listener: SessionListener): () => void {
  sessionListeners.add(listener)
  return () => sessionListeners.delete(listener)
}

let refreshing: Promise<AuthSessionResponse> | null = null

/**
 * Reissues the session cookie with the current memberships. Concurrent
 * `token_stale` answers share a single refresh request.
 */
export function refreshSession(): Promise<AuthSessionResponse> {
  refreshing ??= axios
    .post<AuthSessionResponse>(
      `${API_URL}/auth/refresh-memberships`,
      null,
      { withCredentials: true }
    )
    .then(({ data }) => {
      // Re-resolves the active company: it falls back to another membership
      // when the current one is gone.
      useAuthStore.getState().auth.setSession(data.user)
      sessionListeners.forEach((listener) => listener(data))
      return data
    })
    .finally(() => {
      refreshing = null
    })

  return refreshing
}

/** True for the API answer asking the client to refresh its memberships. */
export function isTokenStale(error: unknown): boolean {
  if (!(error instanceof AxiosError) || error.response?.status !== 401) {
    return false
  }
  const body = error.response.data as { code?: unknown } | undefined
  return body?.code === AUTH_ERROR_CODES.tokenStale
}

type RetriableConfig = InternalAxiosRequestConfig & { _sessionRetried?: boolean }

/** Header + stale-session recovery shared by every API client. */
export function withTenantContext(instance: AxiosInstance): AxiosInstance {
  // Multi-company: the active company travels on every request. The API only
  // honors it when it is one of the session's memberships.
  instance.interceptors.request.use((config) => {
    const companyId = useAuthStore.getState().auth.company?.id
    if (companyId) {
      config.headers.set(COMPANY_HEADER, companyId)
    }
    return config
  })

  // A `null` answer arrives as 200 with an EMPTY body (Nest sends nothing for
  // nil), which axios hands over as `''`: restore the `null` so `.nullable()`
  // contracts parse it.
  // `token_stale`: refresh the memberships once and replay the request with
  // the (possibly re-resolved) active company. A second failure surfaces.
  instance.interceptors.response.use(
    (response) => {
      if (response.data === '') response.data = null
      return response
    },
    async (error: unknown) => {
      const config = (error as AxiosError).config as RetriableConfig | undefined
      if (!config || config._sessionRetried || !isTokenStale(error)) {
        throw error
      }

      config._sessionRetried = true
      await refreshSession()
      config.headers.delete(COMPANY_HEADER)
      return instance.request(config)
    }
  )

  return instance
}

export const client = (path: string) =>
  withTenantContext(
    axios.create({
      baseURL: API_URL + path,
      withCredentials: true,
    })
  )
