import { useQuery } from '@tanstack/react-query'
import type {
  AnalyticsRangeQuery,
  ChannelFilter,
  ControlMetric,
} from '@chat-crm/contracts'
import { useAuthStore } from '@/stores/auth-store'
import {
  getAgentControl,
  getAgentsPerformance,
  getDelivery,
  getLiveSnapshot,
  getMyPerformance,
  getReadiness,
  getSentimentAnalytics,
  getStaffing,
  getVolume,
} from '../clients/analytics.client'
import { getSpendSummary } from '../clients/spend.client'
import { analyticsKey, LIVE_STALE_MS, PERIOD_STALE_MS } from '../lib/query-keys'

/**
 * One hook per analytics resource. They share these rules:
 * - keyed by company, so switching company never shows the previous one;
 * - previous data stays on screen while refetching (no flicker on live
 *   updates);
 * - errors are thrown to the nearest widget boundary, so one failing widget
 *   shows its own retry and the rest of the page keeps working.
 */
export type AnalyticsRange = Pick<AnalyticsRangeQuery, 'period' | 'channel'> & {
  month?: string
}

const useCompanyId = () =>
  useAuthStore((state) => state.auth.company?.id ?? null)

/**
 * Keeps the previous data while a key changes (period, live refetch), but
 * never across companies: another company's numbers must not flash.
 */
const withinCompany =
  (companyId: string | null) =>
  <T>(
    previous: T | undefined,
    previousQuery?: { queryKey: readonly unknown[] }
  ) =>
    previousQuery?.queryKey[2] === companyId ? previous : undefined

const shared = (companyId: string | null) => ({
  placeholderData: withinCompany(companyId),
  throwOnError: true as const,
})

export function useLiveSnapshot(channel: ChannelFilter = 'all') {
  const companyId = useCompanyId()
  return useQuery({
    queryKey: analyticsKey('live', companyId, { channel }),
    queryFn: () => getLiveSnapshot(channel),
    enabled: !!companyId,
    staleTime: LIVE_STALE_MS,
    ...shared(companyId),
  })
}

/** Not thrown: the page falls back to the regular views if it fails. */
export function useReadiness() {
  const companyId = useCompanyId()
  return useQuery({
    queryKey: analyticsKey('readiness', companyId),
    queryFn: getReadiness,
    enabled: !!companyId,
    staleTime: PERIOD_STALE_MS,
  })
}

export function useMyPerformance(range: AnalyticsRange) {
  const companyId = useCompanyId()
  return useQuery({
    queryKey: analyticsKey('me', companyId, range),
    queryFn: () => getMyPerformance(range),
    enabled: !!companyId,
    staleTime: PERIOD_STALE_MS,
    ...shared(companyId),
  })
}

export function useAgentsPerformance(range: AnalyticsRange) {
  const companyId = useCompanyId()
  return useQuery({
    queryKey: analyticsKey('agents', companyId, range),
    queryFn: () => getAgentsPerformance(range),
    enabled: !!companyId,
    staleTime: PERIOD_STALE_MS,
    ...shared(companyId),
  })
}

export function useAgentControl(
  memberId: string | null,
  metric: ControlMetric,
  range: AnalyticsRange
) {
  const companyId = useCompanyId()
  return useQuery({
    queryKey: analyticsKey('control', companyId, { memberId, metric, range }),
    queryFn: () => getAgentControl(memberId as string, { ...range, metric }),
    enabled: !!companyId && !!memberId,
    staleTime: PERIOD_STALE_MS,
    ...shared(companyId),
  })
}

export function useStaffing(channel: ChannelFilter = 'all') {
  const companyId = useCompanyId()
  return useQuery({
    queryKey: analyticsKey('staffing', companyId, { channel }),
    queryFn: () => getStaffing(channel),
    enabled: !!companyId,
    staleTime: PERIOD_STALE_MS,
    ...shared(companyId),
  })
}

export function useVolume(range: AnalyticsRange) {
  const companyId = useCompanyId()
  return useQuery({
    queryKey: analyticsKey('volume', companyId, range),
    queryFn: () => getVolume(range),
    enabled: !!companyId,
    staleTime: PERIOD_STALE_MS,
    ...shared(companyId),
  })
}

export function useDelivery(range: AnalyticsRange) {
  const companyId = useCompanyId()
  return useQuery({
    queryKey: analyticsKey('delivery', companyId, range),
    queryFn: () => getDelivery(range),
    enabled: !!companyId,
    staleTime: PERIOD_STALE_MS,
    ...shared(companyId),
  })
}

/** Only call from components mounted while the IA is available. */
export function useSentimentAnalytics(
  range: AnalyticsRange,
  scope: 'company' | 'me' = 'company'
) {
  const companyId = useCompanyId()
  return useQuery({
    queryKey: analyticsKey('sentiment', companyId, { ...range, scope }),
    queryFn: () => getSentimentAnalytics({ ...range, scope }),
    enabled: !!companyId,
    staleTime: PERIOD_STALE_MS,
    ...shared(companyId),
  })
}

export function useSpendSummary(month?: string) {
  const companyId = useCompanyId()
  return useQuery({
    queryKey: analyticsKey('spend', companyId, { month: month ?? null }),
    queryFn: () => getSpendSummary(month),
    enabled: !!companyId,
    staleTime: PERIOD_STALE_MS,
    ...shared(companyId),
  })
}
