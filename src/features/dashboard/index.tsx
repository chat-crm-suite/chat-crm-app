import { useAuthStore } from '@/stores/auth-store'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { NotificationBell } from '@/components/notifications-bell'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { KPIs } from '@/features/dashboard/components/KPIs'
import { TopAgentsChart } from '@/features/dashboard/components/best-agents'
import { TopClientsChart } from '@/features/dashboard/components/best-clients'
import { ExportDashboardButton } from '@/features/dashboard/components/export-button'
import { SentimentLineChart } from '@/features/dashboard/components/sentimient-line-chat'

export function Dashboard() {
  const { user, company } = useAuthStore().auth
  // v2: role lives in memberships (per company), not on the user.
  const isAdmin =
    user?.isPlatformAdmin ||
    user?.memberships?.some(
      (m) => m.role === 'admin' && (!company?.id || m.companyId === company.id)
    )
  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        {/* <TopNav links={topNav} /> */}
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <NotificationBell />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <h1 className='text-2xl font-bold tracking-tight'>Dashboard</h1>
          <ExportDashboardButton />
        </div>
        <div className='space-y-4' id='metrics'>
          <KPIs />
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
            <SentimentLineChart />

            {isAdmin ? <TopAgentsChart /> : <TopClientsChart />}
          </div>
        </div>
      </Main>
    </>
  )
}
