import type { AgentPerformance } from '@chat-crm/contracts'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useAgentsPerformance,
  type AnalyticsRange,
} from '../hooks/use-analytics-queries'
import { formatDuration, formatHours } from '../lib/format'
import { RateWithInterval } from './interval-whisker'
import { WidgetSkeleton } from './widget'

type PerformanceTableProps = {
  range: AnalyticsRange
  showTone: boolean
  selectedMemberId: string | null
  onSelect: (agent: AgentPerformance) => void
}

/**
 * Per-agent sheet for the range. Rates are empirical-Bayes adjusted (an
 * agent with 3 cases cannot top one with 300 by luck) and drawn with their
 * 95 % interval. No composite score: invented weights have no math behind.
 */
export function PerformanceTable({
  range,
  showTone,
  selectedMemberId,
  onSelect,
}: PerformanceTableProps) {
  const { data } = useAgentsPerformance(range)
  if (!data) return <WidgetSkeleton rows={5} />
  if (data.agents.length === 0) {
    return (
      <p className='text-muted-foreground py-3 text-sm'>
        Ningún agente atendió casos en este periodo.
      </p>
    )
  }

  return (
    <div className='space-y-2'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Agente</TableHead>
            <TableHead className='text-end'>Resueltos</TableHead>
            <TableHead className='text-end'>Conectado</TableHead>
            <TableHead className='text-end'>1ª respuesta</TableHead>
            <TableHead>En tiempo</TableHead>
            <TableHead>Reabiertos</TableHead>
            <TableHead>Transferidos</TableHead>
            {showTone && <TableHead>Tono negativo</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.agents.map((agent) => {
            const selected = agent.memberId === selectedMemberId
            const few = agent.serviceLevel.meta.status !== 'ok'
            return (
              <TableRow
                key={agent.memberId}
                data-state={selected ? 'selected' : undefined}
                className='cursor-pointer'
                onClick={() => onSelect(agent)}
              >
                <TableCell>
                  <button
                    type='button'
                    className={cn(
                      'text-start font-medium hover:underline',
                      selected && 'underline'
                    )}
                    aria-pressed={selected}
                    onClick={(event) => {
                      event.stopPropagation()
                      onSelect(agent)
                    }}
                  >
                    {agent.displayName}
                  </button>
                  {few && (
                    <span className='text-muted-foreground block text-xs'>
                      pocos datos
                    </span>
                  )}
                </TableCell>
                <TableCell className='text-end tabular-nums'>
                  <span className='font-medium'>{agent.resolvedCases}</span>
                  <span className='text-muted-foreground'>
                    {' '}
                    de {agent.handledCases}
                  </span>
                </TableCell>
                <TableCell className='text-end tabular-nums'>
                  {formatHours(agent.connectedSeconds)}
                </TableCell>
                <TableCell className='text-end tabular-nums'>
                  {formatDuration(agent.firstResponse.median)}
                  <span className='text-muted-foreground block text-xs'>
                    9 de 10 en {formatDuration(agent.firstResponse.p90)}
                  </span>
                </TableCell>
                <TableCell>
                  <RateWithInterval rate={agent.serviceLevel} adjusted />
                </TableCell>
                <TableCell>
                  <RateWithInterval rate={agent.reopenRate} adjusted />
                </TableCell>
                <TableCell>
                  <RateWithInterval rate={agent.transferRate} adjusted />
                </TableCell>
                {showTone && (
                  <TableCell>
                    {agent.negativeTone ? (
                      <RateWithInterval rate={agent.negativeTone} adjusted />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <p className='text-muted-foreground text-xs'>
        Tasas ajustadas por volumen de casos. El bigote es el intervalo del 95
        %: si dos bigotes se solapan, la diferencia entre esos agentes no está
        probada.
      </p>
    </div>
  )
}
