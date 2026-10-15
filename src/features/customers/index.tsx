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
import { CustomersScreen } from './customers-screen'
import type { CustomersSearch } from './search'

const route = getRouteApi('/_authenticated/customers/')

/** `/customers`: binds the table state and the open sheets to the URL. */
export function Customers() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const onSearchChange = useCallback(
    (patch: Partial<CustomersSearch>) =>
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
        <CustomersScreen search={search} onSearchChange={onSearchChange} />
      </Main>
    </>
  )
}
