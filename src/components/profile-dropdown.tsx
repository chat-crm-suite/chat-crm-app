import { Link } from '@tanstack/react-router'
import { LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { resolveMediaUrl } from '@/lib/media-url'
import { useAuthStore } from '@/stores/auth-store'
import useDialogState from '@/hooks/use-dialog-state'
import { useMemberRole } from '@/hooks/use-member-role'
import { ROLE_LABELS, userDisplayName } from '@/components/layout/copy'
import { SignOutDialog } from '@/components/sign-out-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ProfileDropdown() {
  const user = useAuthStore((state) => state.auth.user)
  const { role } = useMemberRole()
  const [open, setOpen] = useDialogState()

  const name = user ? userDisplayName(user) : 'Sin nombre'

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            aria-label={`Menú de ${name}`}
            className='relative h-8 w-8 rounded-full'
          >
            <Avatar className='h-8 w-8'>
              <AvatarImage src={resolveMediaUrl(user?.avatarUrl)} alt='' />
              <AvatarFallback>
                {name.charAt(0).toUpperCase() || '#'}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-56' align='end' forceMount>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col gap-1.5'>
              <p className='text-sm leading-none font-medium'>{name}</p>
              <p className='text-muted-foreground text-xs leading-none'>
                {role ? ROLE_LABELS[role] : 'Sin rol'}
              </p>
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

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}
