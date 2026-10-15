import { useState } from 'react'
import type {
  AnalyticsPeriod,
  ChannelFilter,
  MemberRole,
} from '@chat-crm/contracts'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { downloadPerformanceCsv } from '../clients/analytics.client'
import { CustomerToneBreakdown } from '../components/customer-tone-breakdown'
import { DeliveryHealth } from '../components/delivery-health'
import { MonthSelect, PeriodSelect } from '../components/range-filters'
import { SpendPanel } from '../components/spend-panel'
import { SystemPanel } from '../components/system-panel'
import { VolumeTrend } from '../components/volume-trend'
import { Widget } from '../components/widget'
import type { AnalyticsRange } from '../hooks/use-analytics-queries'
import type { IaAvailability } from '../hooks/use-ia-status'
import { recentMonths } from '../lib/months'
import { FloorMonitor } from './floor-monitor'
import { PerformanceSection } from './performance-section'

type Tab = 'operations' | 'performance' | 'spend' | 'system'

const TABS: { value: Tab; label: string; adminOnly: boolean }[] = [
  { value: 'operations', label: 'Operación', adminOnly: false },
  { value: 'performance', label: 'Rendimiento', adminOnly: false },
  { value: 'spend', label: 'Gasto por canal', adminOnly: true },
  { value: 'system', label: 'Sistema', adminOnly: true },
]

type CompanyOverviewProps = {
  role: Extract<MemberRole, 'admin' | 'supervisor'>
  channel: ChannelFilter
  ia: IaAvailability
}

/**
 * Supervisors decide about agents: operations + performance. Admins decide
 * about the whole company: they also get channel spend and system status.
 */
export function CompanyOverview({ role, channel, ia }: CompanyOverviewProps) {
  const isAdmin = role === 'admin'
  const [tab, setTab] = useState<Tab>('operations')
  const showTone = ia.available

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className='gap-4'>
      <TabsList className='w-full justify-start overflow-x-auto sm:w-auto'>
        {TABS.filter((t) => isAdmin || !t.adminOnly).map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value='operations'>
        <FloorMonitor channel={channel} showTone={showTone} />
      </TabsContent>

      <TabsContent value='performance'>
        <PerformanceTab
          isAdmin={isAdmin}
          channel={channel}
          showTone={showTone}
        />
      </TabsContent>

      {isAdmin && (
        <>
          <TabsContent value='spend'>
            <SpendTab />
          </TabsContent>
          <TabsContent value='system'>
            <Widget title='Estado del sistema'>
              <SystemPanel ia={ia} />
            </Widget>
          </TabsContent>
        </>
      )}
    </Tabs>
  )
}

function PerformanceTab({
  isAdmin,
  channel,
  showTone,
}: {
  isAdmin: boolean
  channel: ChannelFilter
  showTone: boolean
}) {
  // Admins evaluate closed calendar months (payroll); supervisors coach on
  // recent rolling periods.
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d')
  const [month, setMonth] = useState(() => recentMonths()[0])
  const range: AnalyticsRange = isAdmin
    ? { period: '30d', month, channel }
    : { period, channel }

  return (
    <div className='space-y-4'>
      <Widget
        title='Rendimiento por agente'
        description='Mediana y p90 en lugar de promedios; tasas con su intervalo de confianza.'
        actions={
          isAdmin ? (
            <>
              <MonthSelect value={month} onChange={setMonth} />
              <ExportCsvButton month={month} channel={channel} />
            </>
          ) : (
            <PeriodSelect value={period} onChange={setPeriod} />
          )
        }
      >
        <PerformanceSection range={range} showTone={showTone} />
      </Widget>

      <Widget title='Volumen de casos'>
        <VolumeTrend range={range} />
      </Widget>

      {isAdmin && (
        <Widget title='Entrega de mensajes'>
          <DeliveryHealth range={range} />
        </Widget>
      )}

      {showTone && (
        <Widget title='Tono de los clientes'>
          <CustomerToneBreakdown range={range} scope='company' withControl />
        </Widget>
      )}
    </div>
  )
}

function ExportCsvButton({
  month,
  channel,
}: {
  month: string
  channel: ChannelFilter
}) {
  const [busy, setBusy] = useState(false)
  return (
    <Button
      variant='outline'
      size='sm'
      className='h-9'
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          await downloadPerformanceCsv({ month, channel })
        } catch {
          toast.error('No se pudo exportar la hoja de rendimiento.')
        } finally {
          setBusy(false)
        }
      }}
    >
      <Download className='size-3.5' aria-hidden />
      {busy ? 'Exportando…' : 'Exportar CSV'}
    </Button>
  )
}

function SpendTab() {
  const [month, setMonth] = useState(() => recentMonths()[0])
  return (
    <Widget
      title='Gasto por canal'
      description='Aproximado: mensajes cobrables por la tarifa configurada de cada categoría.'
      actions={<MonthSelect value={month} onChange={setMonth} />}
    >
      <SpendPanel month={month} />
    </Widget>
  )
}
