import { useAuthStore } from '@/stores/auth-store'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ContactsProvider } from '@/features/contacts/components/contacts-provider'
import { ContactTableData } from '@/features/contacts/components/contacts-table-data'
import { ContactsDialogs } from './components/contacts-dialogs'
import { ContactsPrimaryButtons } from './components/contacts-primary-buttons'

export function Contacts() {
  const { user, company } = useAuthStore().auth
  const isAdmin =
    user?.memberships.some(
      (membership) =>
        membership.companyId === company.id && membership.role === 'admin'
    ) ?? false

  return (
    <ContactsProvider>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-2 flex flex-wrap items-center justify-between space-y-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Contact List</h2>
            <p className='text-muted-foreground'>
              Manage your contacts and their details here.
            </p>
          </div>
          {isAdmin && <ContactsPrimaryButtons />}
        </div>
        <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
          <ContactTableData />
        </div>
      </Main>

      <ContactsDialogs />
    </ContactsProvider>
  )
}
