import type {
  AgentFloorRow,
  AgentPerformance,
  AgentsPerformance,
  AnalyticsReadiness,
  ControlChart,
  DataSufficiency,
  IaStatus,
  LiveSnapshot,
  MyPerformance,
  RateEstimate,
  Staffing,
} from '@chat-crm/contracts'

/**
 * Typed analytics fixtures (`z.infer` of the shared contracts), so a contract
 * change breaks these at compile time instead of drifting silently.
 */
export const NOW = new Date('2026-10-14T15:00:00Z')

export const ok = (sampleSize = 40, minimumSample = 5): DataSufficiency => ({
  status: 'ok',
  sampleSize,
  minimumSample,
})
export const empty = (minimumSample = 5): DataSufficiency => ({
  status: 'empty',
  sampleSize: 0,
  minimumSample,
})
export const insufficient = (
  sampleSize: number,
  minimumSample: number
): DataSufficiency => ({
  status: 'insufficient',
  sampleSize,
  minimumSample,
})

export const rate = (successes: number, trials: number): RateEstimate => ({
  value: trials ? successes / trials : null,
  successes,
  trials,
  interval: trials
    ? {
        low: Math.max(0, successes / trials - 0.08),
        high: Math.min(1, successes / trials + 0.06),
      }
    : null,
  adjusted: trials ? successes / trials : null,
  meta: trials ? ok(trials) : empty(1),
})

export const emptyRate = (): RateEstimate => rate(0, 0)

const range = {
  from: new Date('2026-10-14T00:00:00Z'),
  to: NOW,
  period: 'today' as const,
  month: null,
  timezone: 'America/Lima',
}

export const controlChart = (days = 10): ControlChart => ({
  points: Array.from({ length: days }, (_, i) => ({
    date: `2026-10-${String(i + 1).padStart(2, '0')}`,
    value: 120 + i,
    signal: i === days - 1 ? 'beyond-limits' : 'none',
  })),
  center: 125,
  upperLimit: 180,
  lowerLimit: 70,
  meta: ok(days, 8),
})

export const insufficientControl = (): ControlChart => ({
  points: [],
  center: null,
  upperLimit: null,
  lowerLimit: null,
  meta: insufficient(3, 8),
})

export const agentRow = (
  overrides: Partial<AgentFloorRow> = {}
): AgentFloorRow => ({
  memberId: 'member-carla',
  displayName: 'Carla',
  role: 'agent',
  presence: 'available',
  presenceSince: new Date('2026-10-14T13:00:00Z'),
  openCases: 6,
  capacity: 8,
  waitingCount: 2,
  oldestWaitingSeconds: 362,
  firstResponseTodayMedian: 180,
  negativeToneShare: 0.12,
  ...overrides,
})

export const liveSnapshot = (
  overrides: Partial<LiveSnapshot> = {}
): LiveSnapshot => ({
  generatedAt: NOW,
  slaSeconds: 300,
  waiting: [
    {
      caseId: 'case-1',
      conversationId: 'conv-1',
      channelType: 'whatsapp',
      customer: { id: 'cust-1', displayName: 'Ana Rojas' },
      assignee: { memberId: 'member-carla', displayName: 'Carla' },
      waitingSince: new Date(NOW.getTime() - 432_000),
      waitingSeconds: 432,
      slaState: 'breach',
    },
    {
      caseId: 'case-2',
      conversationId: 'conv-2',
      channelType: 'whatsapp',
      customer: { id: 'cust-2', displayName: 'Luis Pérez' },
      assignee: null,
      waitingSince: new Date(NOW.getTime() - 160_000),
      waitingSeconds: 160,
      slaState: 'ok',
    },
  ],
  waitingTotal: 2,
  queue: { unassignedCount: 1, oldestWaitingSeconds: 160 },
  queuePressure: {
    arrivalsPerHour: 18,
    medianWaitSeconds: 246,
    expectedQueueLength: 1.2,
    observedQueueLength: 3,
    trend: 'building',
    meta: ok(),
  },
  agents: [agentRow()],
  me: null,
  ...overrides,
})

export const emptyLiveSnapshot = (): LiveSnapshot => ({
  generatedAt: NOW,
  slaSeconds: 300,
  waiting: [],
  waitingTotal: 0,
  queue: { unassignedCount: 0, oldestWaitingSeconds: null },
  queuePressure: null,
  agents: [],
  me: null,
})

export const agentPerformance = (
  overrides: Partial<AgentPerformance> = {}
): AgentPerformance => ({
  memberId: 'member-carla',
  displayName: 'Carla',
  role: 'agent',
  handledCases: 24,
  resolvedCases: 21,
  connectedSeconds: 6 * 3600,
  availableSeconds: 5 * 3600,
  occupancy: 0.7,
  firstResponse: { median: 130, p90: 400, meta: ok() },
  replyTime: { median: 90, p90: 300, meta: ok() },
  resolutionTime: { median: 1800, p90: 7200, meta: ok() },
  serviceLevel: rate(18, 21),
  reopenRate: rate(1, 21),
  transferRate: rate(2, 24),
  messagesPerCase: { inboundMedian: 4, outboundMedian: 5, meta: ok() },
  negativeTone: rate(3, 40),
  ...overrides,
})

export const myPerformance = (
  overrides: Partial<MyPerformance> = {}
): MyPerformance => ({
  range,
  slaSeconds: 300,
  performance: agentPerformance(),
  firstResponseHistogram: {
    bins: [
      { fromSeconds: 0, toSeconds: 60, count: 4 },
      { fromSeconds: 60, toSeconds: 300, count: 12 },
      { fromSeconds: 300, toSeconds: null, count: 3 },
    ],
    meta: ok(),
  },
  firstResponseControl: controlChart(),
  team: {
    agentCount: 4,
    firstResponseMedian: 165,
    firstResponseP90: 485,
    serviceLevel: 0.82,
    resolutionTimeMedian: 2000,
    reopenRate: 0.05,
  },
  openCases: 6,
  capacity: 8,
  ...overrides,
})

export const agentsPerformance = (
  agents = [agentPerformance()]
): AgentsPerformance => ({
  range,
  slaSeconds: 300,
  agents,
  team: myPerformance().team,
})

export const staffing = (overrides: Partial<Staffing> = {}): Staffing => ({
  slaSeconds: 300,
  targetServiceLevel: 0.8,
  handleTimeSeconds: 420,
  historyDays: 56,
  hours: [
    {
      hourStart: new Date('2026-10-14T15:00:00Z'),
      expectedArrivals: 18,
      requiredAgents: 4,
      availableAgents: 3,
    },
  ],
  heatmap: [{ weekday: 2, hour: 15, averageArrivals: 18 }],
  meta: ok(56, 14),
  ...overrides,
})

export const readiness = (
  overrides: Partial<AnalyticsReadiness> = {}
): AnalyticsReadiness => ({
  isEmpty: false,
  channels: [{ channelType: 'whatsapp', connected: true }],
  firstMessageReceived: true,
  businessHoursConfigured: true,
  agentCount: 3,
  activeDays: 20,
  ...overrides,
})

export const iaActive: IaStatus = {
  status: 'active',
  enabled: true,
  available: true,
  breaker: 'closed',
}
export const iaDisabled: IaStatus = {
  status: 'disabled',
  enabled: false,
  available: false,
  breaker: 'closed',
}
export const iaDown: IaStatus = {
  status: 'unavailable',
  enabled: true,
  available: false,
  breaker: 'open',
}
