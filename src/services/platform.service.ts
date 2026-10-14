import {
  PlatformCompanyRowSchema,
  PlatformCompanyTableResponseSchema,
  PlatformCreateCompanyResultSchema,
  PlatformDeleteCompanyResultSchema,
  PlatformStatusSchema,
  type PlatformCompanyQuery,
  type PlatformCompanyRow,
  type PlatformCompanyTableResponse,
  type PlatformCreateCompanyInput,
  type PlatformCreateCompanyResult,
  type PlatformDeleteCompanyResult,
  type PlatformStatus,
  type PlatformUpdateCompanyInput,
} from '@chat-crm/contracts'
import { isAxiosError } from 'axios'
import { client } from '@/lib/http'

const platform = client('/platform')

/** Body code the API sends with a 403 when the 30-minute token is gone. */
export const PLATFORM_LOCKED_CODE = 'platform_locked'

type ApiErrorBody = { code?: string; retryAfterSec?: number }

const bodyOf = (error: unknown): ApiErrorBody | undefined =>
  isAxiosError(error) ? (error.response?.data as ApiErrorBody) : undefined

/** True when the API says the console must be unlocked again. */
export function isPlatformLocked(error: unknown): boolean {
  return (
    isAxiosError(error) &&
    error.response?.status === 403 &&
    bodyOf(error)?.code === PLATFORM_LOCKED_CODE
  )
}

export type UnlockFailure =
  | { kind: 'wrong-password' }
  | { kind: 'rate-limited'; retryAfterSec: number }
  | { kind: 'disabled' }
  | { kind: 'forbidden' }
  | { kind: 'unknown' }

/** Classifies a failed `POST /platform/unlock` for the unlock screen. */
export function classifyUnlockError(error: unknown): UnlockFailure {
  if (!isAxiosError(error)) return { kind: 'unknown' }

  const status = error.response?.status
  const body = bodyOf(error)

  if (status === 429) {
    return {
      kind: 'rate-limited',
      retryAfterSec: Math.max(1, Math.ceil(body?.retryAfterSec ?? 60)),
    }
  }
  if (status === 404) return { kind: 'disabled' }
  if (status === 401) return { kind: 'wrong-password' }
  if (status === 403) {
    return body?.code === 'platform_forbidden'
      ? { kind: 'forbidden' }
      : { kind: 'wrong-password' }
  }
  return { kind: 'unknown' }
}

type LockedListener = () => void
const lockedListeners = new Set<LockedListener>()

/**
 * Notified when any console request answers `platform_locked`, so the UI can
 * go back to the unlock screen. Returns the unsubscribe function.
 */
export function onPlatformLocked(listener: LockedListener): () => void {
  lockedListeners.add(listener)
  return () => lockedListeners.delete(listener)
}

platform.interceptors.response.use(undefined, (error: unknown) => {
  if (isPlatformLocked(error)) lockedListeners.forEach((listener) => listener())
  throw error
})

// Dev-only runtime checks: they catch API/contract drift immediately.
const dev = <T>(schema: { parse: (data: unknown) => T }, data: unknown): T =>
  import.meta.env.DEV ? schema.parse(data) : (data as T)

/** `GET /platform/status`: 200 even while the console is disabled. */
export const getPlatformStatus = async (): Promise<PlatformStatus> => {
  const { data } = await platform.get('/status')
  return dev(PlatformStatusSchema, data)
}

/** `POST /platform/unlock`. */
export const unlockPlatform = async (
  password: string
): Promise<PlatformStatus> => {
  const { data } = await platform.post('/unlock', { password })
  return dev(PlatformStatusSchema, data)
}

/** `POST /platform/lock`. */
export const lockPlatform = async (): Promise<PlatformStatus> => {
  const { data } = await platform.post('/lock')
  return dev(PlatformStatusSchema, data)
}

/** `POST /platform/companies/table`. */
export const getPlatformCompanies = async (
  query: PlatformCompanyQuery
): Promise<PlatformCompanyTableResponse> => {
  const { data } = await platform.post('/companies/table', query)
  return dev(PlatformCompanyTableResponseSchema, data)
}

/** `POST /platform/companies`. */
export const createPlatformCompany = async (
  input: PlatformCreateCompanyInput
): Promise<PlatformCreateCompanyResult> => {
  const { data } = await platform.post('/companies', input)
  return dev(PlatformCreateCompanyResultSchema, data)
}

/** `PATCH /platform/companies/:id`. */
export const updatePlatformCompany = async (
  id: string,
  input: PlatformUpdateCompanyInput
): Promise<PlatformCompanyRow> => {
  const { data } = await platform.patch(`/companies/${id}`, input)
  return dev(PlatformCompanyRowSchema, data)
}

/** `DELETE /platform/companies/:id`: soft delete. */
export const deletePlatformCompany = async (
  id: string
): Promise<PlatformDeleteCompanyResult> => {
  const { data } = await platform.delete(`/companies/${id}`)
  return dev(PlatformDeleteCompanyResultSchema, data)
}

/** `POST /platform/companies/:id/restore`. */
export const restorePlatformCompany = async (
  id: string
): Promise<PlatformCompanyRow> => {
  const { data } = await platform.post(`/companies/${id}/restore`)
  return dev(PlatformCompanyRowSchema, data)
}
