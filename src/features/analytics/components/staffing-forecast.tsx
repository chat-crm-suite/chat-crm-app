import type { ChannelFilter } from '@chat-crm/contracts'
import { Check, X } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useStaffing } from '../hooks/use-analytics-queries'
import {
  formatDecimal,
  formatDuration,
  formatHour,
  formatPercent,
} from '../lib/format'
import { SufficiencyNote } from './sufficiency-note'
import { WidgetSkeleton } from './widget'

/**
 * Erlang C: agents needed per hour to answer the target share within the
 * SLA, from historical arrivals for that weekday/hour and the median handle
 * time, next to the agents available now.
 */
export function StaffingForecast({
  channel = 'all',
}: {
  channel?: ChannelFilter
}) {
  const { data } = useStaffing(channel)
  if (!data) return <WidgetSkeleton rows={4} />

  if (data.meta.status !== 'ok') {
    return (
      <SufficiencyNote
        meta={data.meta}
        unit='days'
        what='estimar el personal necesario'
      />
    )
  }

  return (
    <div className='space-y-2'>
      <p className='text-muted-foreground text-sm'>
        Objetivo: {formatPercent(data.targetServiceLevel)} respondido en menos
        de {formatDuration(data.slaSeconds)} · atención mediana{' '}
        {formatDuration(data.handleTimeSeconds)}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hora</TableHead>
            <TableHead className='text-end'>Llegadas</TableHead>
            <TableHead className='text-end'>Necesarios</TableHead>
            <TableHead className='text-end'>Disponibles</TableHead>
            <TableHead className='sr-only'>Cubierto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.hours.map((hour) => {
            const covered =
              hour.requiredAgents === null ||
              hour.availableAgents >= hour.requiredAgents
            return (
              <TableRow key={hour.hourStart.toISOString()}>
                <TableCell className='tabular-nums'>
                  {formatHour(hour.hourStart)}
                </TableCell>
                <TableCell className='text-end tabular-nums'>
                  {formatDecimal(hour.expectedArrivals)}/h
                </TableCell>
                <TableCell className='text-end font-medium tabular-nums'>
                  {hour.requiredAgents ?? '—'}
                </TableCell>
                <TableCell className='text-end tabular-nums'>
                  {hour.availableAgents}
                </TableCell>
                <TableCell className='w-24'>
                  {covered ? (
                    <span className='text-sla-ok inline-flex items-center gap-1 text-xs'>
                      <Check className='size-3.5' aria-hidden /> cubierto
                    </span>
                  ) : (
                    <span className='text-sla-breach inline-flex items-center gap-1 text-xs font-medium'>
                      <X className='size-3.5' aria-hidden /> faltan{' '}
                      {(hour.requiredAgents ?? 0) - hour.availableAgents}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
