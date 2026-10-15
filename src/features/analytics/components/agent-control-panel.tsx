import { useState } from 'react'
import type { ControlMetric } from '@chat-crm/contracts'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useAgentControl,
  type AnalyticsRange,
} from '../hooks/use-analytics-queries'
import { ControlChart, type ControlValueKind } from './control-chart'
import { WidgetSkeleton } from './widget'

const METRICS: {
  metric: ControlMetric
  label: string
  kind: ControlValueKind
  tone?: boolean
}[] = [
  { metric: 'first-response', label: '1ª respuesta', kind: 'duration' },
  { metric: 'service-level', label: 'En tiempo', kind: 'rate' },
  { metric: 'resolved-cases', label: 'Resueltos', kind: 'count' },
  { metric: 'negative-tone', label: 'Tono negativo', kind: 'rate', tone: true },
]

type AgentControlPanelProps = {
  memberId: string
  range: AnalyticsRange
  showTone: boolean
}

/** One agent's daily series as control charts, one metric at a time. */
export function AgentControlPanel({
  memberId,
  range,
  showTone,
}: AgentControlPanelProps) {
  const available = METRICS.filter((m) => showTone || !m.tone)
  const [metric, setMetric] = useState<ControlMetric>('first-response')
  const current = available.find((m) => m.metric === metric) ?? available[0]
  const { data } = useAgentControl(memberId, current.metric, range)

  return (
    <div className='space-y-3'>
      <Tabs
        value={current.metric}
        onValueChange={(v) => setMetric(v as ControlMetric)}
      >
        <TabsList>
          {available.map((m) => (
            <TabsTrigger key={m.metric} value={m.metric}>
              {m.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {data ? (
        <ControlChart
          chart={data.chart}
          kind={current.kind}
          label={current.label}
        />
      ) : (
        <WidgetSkeleton rows={4} />
      )}
    </div>
  )
}
