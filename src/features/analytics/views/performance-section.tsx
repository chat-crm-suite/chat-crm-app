import { useState } from 'react'
import type { AgentPerformance } from '@chat-crm/contracts'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AgentControlPanel } from '../components/agent-control-panel'
import { PerformanceTable } from '../components/performance-table'
import type { AnalyticsRange } from '../hooks/use-analytics-queries'

type PerformanceSectionProps = {
  range: AnalyticsRange
  showTone: boolean
}

/** Agents table; picking an agent opens their control charts below it. */
export function PerformanceSection({
  range,
  showTone,
}: PerformanceSectionProps) {
  const [selected, setSelected] = useState<AgentPerformance | null>(null)

  return (
    <div className='space-y-4'>
      <PerformanceTable
        range={range}
        showTone={showTone}
        selectedMemberId={selected?.memberId ?? null}
        onSelect={(agent) =>
          setSelected((current) =>
            current?.memberId === agent.memberId ? null : agent
          )
        }
      />
      {selected ? (
        <div className='space-y-3 border-t pt-4'>
          <div className='flex items-center justify-between gap-3'>
            <p className='font-medium'>{selected.displayName}, día a día</p>
            <Button
              variant='ghost'
              size='icon'
              className='size-8'
              aria-label='Cerrar el detalle del agente'
              onClick={() => setSelected(null)}
            >
              <X className='size-4' />
            </Button>
          </div>
          <AgentControlPanel
            memberId={selected.memberId}
            range={range}
            showTone={showTone}
          />
        </div>
      ) : (
        <p className='text-muted-foreground text-sm'>
          Elige un agente para ver su evolución diaria en gráficos de control.
        </p>
      )}
    </div>
  )
}
