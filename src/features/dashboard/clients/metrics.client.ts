import { client } from '@/lib/http'

const metrics = client('/metrics')

export interface KPIValue {
  value: number
  porcentLastMonth: string // Ej: "+0.00%" o "-100.00%"
}

export interface SentimentKPIs {
  pos: KPIValue
  neg: KPIValue
  neu: KPIValue
}

type SentimentTrend = {
  date: string // 'YYYY-MM-DD'
  pos: number
  neg: number
  neu: number
}

export interface DashboardKPIs {
  activeChats: KPIValue
  messagesThisMonth: KPIValue
  agentsActive: KPIValue
  transfersThisMonth: KPIValue
  sentimentToday: SentimentKPIs
}

type ActiveContact = {
  id: string
  username: string | null
  label: string
  positive: number
  neutral: number
  negative: number
  total: number
}

/**
 * Raw `GET /metrics/sentiment/top` item (schema v2). Note: the API serializes
 * the owner under the `onwer` key (historical typo); both spellings are
 * tolerated so the UI survives either one.
 */
type SentimentTopResponse = {
  onwer?: { id: string; username: string | null }
  owner?: { id: string; username: string | null }
  label?: string
  sentiment?: { pos?: number; neu?: number; neg?: number }
  total?: number
}

const toRankedRow = (item: SentimentTopResponse): ActiveContact => {
  const owner = item.onwer ?? item.owner ?? { id: '', username: null }
  return {
    id: owner.id ?? '',
    username: owner.username,
    label: item.label ?? '',
    positive: Number(item.sentiment?.pos ?? 0),
    neutral: Number(item.sentiment?.neu ?? 0),
    negative: Number(item.sentiment?.neg ?? 0),
    total: Number(item.total ?? 0),
  }
}

// export const getKpis = metrics.get<DashboardKPIs>("/kpis").then(res => res.data)

export const getCompare = (metric: string, period: string) =>
  metrics.get(`${metric}/compare`, { params: { period } }).then((res) => {
    console.log(res)
    return res.data
  })

export const getSentimentMonthlyTrend = metrics
  .get<SentimentTrend[]>('sentiment/trend', {
    params: { period: 'month' },
  })
  .then((res) => res.data)

export const getTopContacts = metrics
  .get<
    SentimentTopResponse[]
  >('/sentiment/top', { params: { actor: 'client', type: 'neutral' } })
  .then((res) => (res.data ?? []).map(toRankedRow))

export const getBestAgents = metrics
  .get<
    SentimentTopResponse[]
  >('/sentiment/top', { params: { actor: 'agent', type: 'neutral' } })
  .then((res) => (res.data ?? []).map(toRankedRow))

export const getBestClients = metrics
  .get<SentimentTopResponse[]>('/sentiment/top', {
    params: {
      actor: 'client',
      type: 'positive',
    },
  })
  .then((res) => (res.data ?? []).map(toRankedRow))

export const getSentimentTrend = (period: string) =>
  metrics
    .get<SentimentTrend[]>('sentiment/trend', {
      params: { period },
    })
    .then((res) => res.data)
