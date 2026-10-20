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
import type { TemplatesSearch } from './search'
import { TemplatesScreen } from './templates-screen'

const route = getRouteApi('/_authenticated/templates/')

/** `/templates` (Plantillas): binds filters and the open sheet to the URL. */
export function Templates() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const onSearchChange = useCallback(
    (patch: Partial<TemplatesSearch>) =>
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
        <TemplatesScreen search={search} onSearchChange={onSearchChange} />
      </Main>
    </>
  )
}
