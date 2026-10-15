import { useState } from 'react'
import type { AnalyticsPeriod, ChannelFilter } from '@chat-crm/contracts'
import { ImageDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSocket } from '@/context/socket-provider'
import { useMemberRole } from '@/hooks/use-member-role'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { NotificationBell } from '@/components/notifications-bell'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { IaStatusNotice } from './components/ia-status-notice'
import { PresenceToggle } from './components/presence-toggle'
import { ChannelSelect, PeriodSelect } from './components/range-filters'
import { WelcomeView } from './components/welcome-view'
import { useReadiness } from './hooks/use-analytics-queries'
import { useAnalyticsRealtime } from './hooks/use-analytics-realtime'
import { useExportPng } from './hooks/use-export-png'
import { useIaStatus } from './hooks/use-ia-status'
import { AgentDesk } from './views/agent-desk'
import { CompanyOverview } from './views/company-overview'

const TITLES = {
  agent: 'Mi turno',
  supervisor: 'Piso en vivo',
  admin: 'Empresa',
} as const

/**
 * Analytics home: one view per role. Agents get their desk; supervisors the
 * floor and agent performance; admins also channel spend and system status.
 * A fresh install shows the welcome checklist instead of empty charts.
 */
export function Analytics() {
  const { role, memberId, isAdmin } = useMemberRole()
  const ia = useIaStatus()
  const readiness = useReadiness()
  const { isConnected } = useSocket()
  const { exportPng } = useExportPng()
  const [channel, setChannel] = useState<ChannelFilter>('all')
  const [period, setPeriod] = useState<AnalyticsPeriod>('today')

  useAnalyticsRealtime(memberId)

  const effectiveRole = role ?? 'agent'
  const connectedChannels = (readiness.data?.channels ?? [])
    .filter((c) => c.connected)
    .map((c) => c.channelType)

  return (
    <>
      <Header>
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <NotificationBell />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3'>
          <div className='space-y-1'>
            <h1 className='text-[28px] leading-tight font-semibold tracking-tight'>
              {TITLES[effectiveRole]}
            </h1>
            <LiveIndicator connected={isConnected} />
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <ChannelSelect
              channels={connectedChannels}
              value={channel}
              onChange={setChannel}
            />
            {effectiveRole === 'agent' && (
              <PeriodSelect value={period} onChange={setPeriod} />
            )}
            <PresenceToggle />
            <Button
              variant='ghost'
              size='icon'
              className='size-9'
              aria-label='Descargar imagen de las métricas'
              title='Descargar imagen de las métricas'
              onClick={() => void exportPng('metrics')}
            >
              <ImageDown className='size-4' />
            </Button>
          </div>
        </div>

        <div id='metrics' className='space-y-4'>
          {readiness.data?.isEmpty ? (
            <WelcomeView readiness={readiness.data} isAdmin={isAdmin} />
          ) : (
            <>
              <IaStatusNotice ia={ia} isAdmin={isAdmin} />
              {effectiveRole === 'agent' ? (
                <AgentDesk
                  range={{ period, channel }}
                  showTone={ia.available}
                />
              ) : (
                <CompanyOverview
                  role={effectiveRole}
                  channel={channel}
                  ia={ia}
                />
              )}
            </>
          )}
        </div>
      </Main>
    </>
  )
}

function LiveIndicator({ connected }: { connected: boolean }) {
  return (
    <p className='text-muted-foreground flex items-center gap-2 text-sm'>
      <span
        aria-hidden
        className={cn(
          'size-2 rounded-full',
          connected
            ? 'bg-sla-ok motion-safe:animate-pulse'
            : 'bg-muted-foreground'
        )}
      />
      {connected ? 'En vivo' : 'Sin conexión en vivo, reconectando…'}
    </p>
  )
}
