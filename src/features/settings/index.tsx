import { useMemo } from 'react'
import { Outlet } from '@tanstack/react-router'
import { settingsGroups } from '@/lib/commands'
import { useCommandContext } from '@/lib/use-command-context'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { SidebarNav } from './components/sidebar-nav'

export function Settings() {
  const context = useCommandContext()
  const groups = useMemo(() => settingsGroups(context), [context])

  return (
    <>
      <Header>
        <Search placeholder='Buscar' />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mx-auto flex w-full max-w-5xl flex-col gap-6 lg:flex-row lg:gap-14'>
          <aside className='lg:sticky lg:top-6 lg:w-56 lg:shrink-0 lg:self-start'>
            <h1 className='mb-4 text-2xl font-semibold tracking-tight'>
              Ajustes
            </h1>
            <SidebarNav groups={groups} />
          </aside>
          <div className='min-w-0 flex-1 lg:max-w-2xl'>
            <Outlet />
          </div>
        </div>
      </Main>
    </>
  )
}
