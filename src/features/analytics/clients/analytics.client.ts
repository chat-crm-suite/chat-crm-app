import {
  AgentControlSchema,
  AgentsPerformanceSchema,
  AnalyticsReadinessSchema,
  DeliverySchema,
  LiveSnapshotSchema,
  MyPerformanceSchema,
  SentimentAnalyticsSchema,
  StaffingSchema,
  VolumeSchema,
  type AgentControlQuery,
  type AnalyticsRangeQuery,
  type ChannelFilter,
  type PerformanceExportQuery,
  type SentimentAnalyticsQuery,
} from '@chat-crm/contracts'
import { parseContract } from '@/lib/contract-parse'
import { client } from '@/lib/http'

/**
 * `/analytics/*` client. Plain functions (never import-time promises), so
 * react-query owns when they run and which company they run for.
 */
const analytics = client('/analytics')

/** Query params without the defaults the API applies anyway. */
type RangeParams = Partial<AnalyticsRangeQuery>

export const getLiveSnapshot = async (channel: ChannelFilter = 'all') => {
  const { data } = await analytics.get('/live', { params: { channel } })
  return parseContract(LiveSnapshotSchema, data)
}

export const getReadiness = async () => {
  const { data } = await analytics.get('/readiness')
  return parseContract(AnalyticsReadinessSchema, data)
}

export const getMyPerformance = async (params: RangeParams) => {
  const { data } = await analytics.get('/me', { params })
  return parseContract(MyPerformanceSchema, data)
}

export const getAgentsPerformance = async (params: RangeParams) => {
  const { data } = await analytics.get('/agents', { params })
  return parseContract(AgentsPerformanceSchema, data)
}

export const getAgentControl = async (
  memberId: string,
  params: Partial<AgentControlQuery> & Pick<AgentControlQuery, 'metric'>
) => {
  const { data } = await analytics.get(`/agents/${memberId}/control`, {
    params,
  })
  return parseContract(AgentControlSchema, data)
}

export const getStaffing = async (channel: ChannelFilter = 'all') => {
  const { data } = await analytics.get('/staffing', { params: { channel } })
  return parseContract(StaffingSchema, data)
}

export const getVolume = async (params: RangeParams) => {
  const { data } = await analytics.get('/volume', { params })
  return parseContract(VolumeSchema, data)
}

export const getDelivery = async (params: RangeParams) => {
  const { data } = await analytics.get('/delivery', { params })
  return parseContract(DeliverySchema, data)
}

/** Answers 409 `ia_unavailable` while the IA is off: callers gate on status. */
export const getSentimentAnalytics = async (
  params: Partial<SentimentAnalyticsQuery>
) => {
  const { data } = await analytics.get('/sentiment', { params })
  return parseContract(SentimentAnalyticsSchema, data)
}

/** Downloads the monthly performance sheet as a CSV file. */
export const downloadPerformanceCsv = async (
  params: Partial<PerformanceExportQuery> &
    Pick<PerformanceExportQuery, 'month'>
) => {
  const { data } = await analytics.get<Blob>('/agents/export.csv', {
    params,
    responseType: 'blob',
  })
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = `rendimiento-${params.month}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
