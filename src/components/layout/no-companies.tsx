import { Link } from '@tanstack/react-router'
import { Building2, LogOut, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import useDialogState from '@/hooks/use-dialog-state'
import { SignOutDialog } from '@/components/sign-out-dialog'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

/**
 * Shown instead of the app when the account has no active membership (all of
 * them were revoked or the companies are suspended). The only useful actions
 * are to leave, or to open the console when the person administers the platform.
 */
export function NoCompanies() {
  const isPlatformAdmin = useAuthStore(
    (state) => state.auth.user?.isPlatformAdmin ?? false
  )
  const [open, setOpen] = useDialogState()

  return (
    <main className='bg-background flex min-h-svh items-center justify-center p-6'>
      <Empty className='border-0'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <Building2 />
          </EmptyMedia>
          <EmptyTitle>Sin empresas</EmptyTitle>
          <EmptyDescription>
            Tu cuenta no tiene acceso a ninguna empresa activa. Pídele a un
            administrador que te agregue a su equipo y vuelve a entrar.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className='flex flex-wrap justify-center gap-2'>
            {isPlatformAdmin ? (
              <Button asChild>
                <Link to='/platform'>
                  <ShieldCheck />
                  Ir a la consola de plataforma
                </Link>
              </Button>
            ) : null}
            <Button
              variant={isPlatformAdmin ? 'outline' : 'default'}
              onClick={() => setOpen(true)}
            >
              <LogOut />
              Cerrar sesión
            </Button>
          </div>
        </EmptyContent>
      </Empty>
      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </main>
  )
}
