import type { AnalyticsScope } from '@chat-crm/contracts'

/**
 * Every analytics query key starts with `['analytics', resource, companyId]`,
 * so switching company refetches and one socket scope invalidates exactly the
 * resources it can change (never a blanket refetch).
 */
export const ANALYTICS_RESOURCES = {
  live: ['live', 'presence', 'cases', 'sentiment'],
  readiness: ['live', 'cases'],
  me: ['cases', 'presence', 'sentiment'],
  agents: ['cases', 'presence', 'sentiment'],
  control: ['cases', 'sentiment'],
  staffing: ['cases', 'presence'],
  volume: ['cases', 'live'],
  delivery: ['live'],
  sentiment: ['sentiment'],
  spend: ['spend', 'cases'],
} as const satisfies Record<string, readonly AnalyticsScope[]>

export type AnalyticsResource = keyof typeof ANALYTICS_RESOURCES

export const analyticsKey = (
  resource: AnalyticsResource,
  companyId: string | null | undefined,
  params?: unknown
) =>
  params === undefined
    ? (['analytics', resource, companyId ?? null] as const)
    : (['analytics', resource, companyId ?? null, params] as const)

/** Resources touched by a batch of `analytics:changed` scopes. */
export function resourcesForScopes(
  scopes: Iterable<AnalyticsScope>
): AnalyticsResource[] {
  const wanted = new Set(scopes)
  return (Object.keys(ANALYTICS_RESOURCES) as AnalyticsResource[]).filter(
    (resource) =>
      ANALYTICS_RESOURCES[resource].some((scope: AnalyticsScope) =>
        wanted.has(scope)
      )
  )
}

/** Live data goes stale fast; ranges are cached server-side anyway. */
export const LIVE_STALE_MS = 15_000
export const PERIOD_STALE_MS = 60_000
