import type {
  AnalyticsPeriod,
  ChannelFilter,
  ChannelType,
} from '@chat-crm/contracts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { channelMeta } from '../lib/channel-meta'
import { formatMonth } from '../lib/format'
import { recentMonths } from '../lib/months'

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  today: 'Hoy',
  '7d': 'Últimos 7 días',
  '30d': 'Últimos 30 días',
  '90d': 'Últimos 90 días',
}

export function PeriodSelect({
  value,
  onChange,
}: {
  value: AnalyticsPeriod
  onChange: (period: AnalyticsPeriod) => void
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as AnalyticsPeriod)}>
      <SelectTrigger className='h-9 w-44' aria-label='Periodo'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(PERIOD_LABELS) as AnalyticsPeriod[]).map((period) => (
          <SelectItem key={period} value={period}>
            {PERIOD_LABELS[period]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function MonthSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (month: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className='h-9 w-48 capitalize' aria-label='Mes'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {recentMonths().map((month) => (
          <SelectItem key={month} value={month} className='capitalize'>
            {formatMonth(month)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Channel filter. Hidden while the company has a single channel: the
 * selector only appears when there is something to choose.
 */
export function ChannelSelect({
  channels,
  value,
  onChange,
}: {
  channels: ChannelType[]
  value: ChannelFilter
  onChange: (channel: ChannelFilter) => void
}) {
  if (channels.length < 2) return null
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ChannelFilter)}>
      <SelectTrigger className='h-9 w-40' aria-label='Canal'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='all'>Todos los canales</SelectItem>
        {channels.map((channel) => (
          <SelectItem key={channel} value={channel}>
            {channelMeta[channel].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
