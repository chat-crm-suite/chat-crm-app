import { ChevronsUpDown, LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import useDialogState from '@/hooks/use-dialog-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { SignOutDialog } from '@/components/sign-out-dialog'

// type NavUserProps = {
//   user: {
//     name: string
//     email: string
//     avatar: string
//   }
// }

export function NavUser() {
  const { user, company } = useAuthStore().auth
  const { isMobile } = useSidebar()
  const [open, setOpen] = useDialogState()
  const username = user?.username ?? 'Sin Nombre'
  const fallback = user?.username?.charAt(0)?.toUpperCase() ?? '#'
  // v2: role lives in memberships (per company), not on the user.
  const activeMembership =
    user?.memberships?.find((m) => m.companyId === company?.id) ??
    user?.memberships?.[0]
  const role = user?.isPlatformAdmin
    ? 'admin'
    : (activeMembership?.role ?? '-')
  const avatarSrc = user?.avatarUrl ?? undefined

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size='lg'
                className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
              >
                <Avatar className='h-8 w-8 rounded-lg'>
                  <AvatarImage src={avatarSrc} alt={username} />
                  <AvatarFallback className='rounded-lg'>
                    {fallback}
                  </AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-start text-sm leading-tight'>
                  <span className='truncate font-semibold capitalize'>
                    {username}
                  </span>
                  <span className='truncate text-xs capitalize'>{role}</span>
                </div>
                <ChevronsUpDown className='ms-auto size-4' />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
              side={isMobile ? 'bottom' : 'right'}
              align='end'
              sideOffset={4}
            >
              <DropdownMenuLabel className='p-0 font-normal'>
                <div className='flex items-center gap-2 px-1 py-1.5 text-start text-sm'>
                  <Avatar className='h-8 w-8 rounded-lg'>
                    <AvatarImage src={avatarSrc} alt={username} />
                    <AvatarFallback className='rounded-lg'>
                      {fallback}
                    </AvatarFallback>
                  </Avatar>
                  <div className='grid flex-1 text-start text-sm leading-tight'>
                    <span className='truncate font-semibold capitalize'>
                      {username}
                    </span>
                    <span className='truncate text-xs capitalize'>{role}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setOpen(true)}>
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}
