import { useCallback } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { NotificationBell } from '@/components/notifications-bell'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { compactSearch } from '../workspace/form-utils'
import type { WorkSearch } from './search'
import { WorkScreen } from './work-screen'

const route = getRouteApi('/_authenticated/tasks/')

/** `/tasks` (Mi trabajo): binds the tab and filters to the URL. */
export function Tasks() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const onSearchChange = useCallback(
    (patch: Partial<WorkSearch>) =>
      void navigate({
        search: (previous) => compactSearch({ ...previous, ...patch }),
        replace: true,
      }),
    [navigate]
  )

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
        <WorkScreen search={search} onSearchChange={onSearchChange} />
      </Main>
    </>
  )
}
