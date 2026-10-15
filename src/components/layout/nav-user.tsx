import { Link } from '@tanstack/react-router'
import { ChevronsUpDown, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { resolveMediaUrl } from '@/lib/media-url'
import { useAuthStore } from '@/stores/auth-store'
import useDialogState from '@/hooks/use-dialog-state'
import { useMemberRole } from '@/hooks/use-member-role'
import { SignOutDialog } from '@/components/sign-out-dialog'
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
import { ROLE_LABELS, userDisplayName } from './copy'

export function NavUser() {
  const user = useAuthStore((state) => state.auth.user)
  const { role } = useMemberRole()
  const { isMobile } = useSidebar()
  const [open, setOpen] = useDialogState()

  const name = user ? userDisplayName(user) : 'Sin nombre'
  const fallback = name.charAt(0).toUpperCase() || '#'
  const roleLabel = role ? ROLE_LABELS[role] : ''
  const avatarSrc = resolveMediaUrl(user?.avatarUrl)

  const identity = (
    <>
      <Avatar className='h-8 w-8 rounded-lg'>
        <AvatarImage src={avatarSrc} alt='' />
        <AvatarFallback className='rounded-lg'>{fallback}</AvatarFallback>
      </Avatar>
      <div className='grid flex-1 text-start text-sm leading-tight'>
        <span className='truncate font-semibold'>{name}</span>
        <span className='truncate text-xs'>{roleLabel}</span>
      </div>
    </>
  )

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size='lg'
                aria-label={`Menú de ${name}`}
                className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
              >
                {identity}
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
                  {identity}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to='/settings'>
                  <UserRound />
                  Mi perfil
                </Link>
              </DropdownMenuItem>
              {user?.isPlatformAdmin ? (
                <DropdownMenuItem asChild>
                  <Link to='/platform'>
                    <ShieldCheck />
                    Consola de plataforma
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setOpen(true)}>
                <LogOut />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}
