import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { CompaniesScreen } from './components/companies-screen'
import { DisabledScreen, UnlockScreen } from './components/unlock-screen'
import { usePlatformStatus } from './hooks/use-platform-status'
import type { CompaniesSearch } from './lib/companies-search'

type PlatformHomeProps = {
  search: CompaniesSearch
  onSearchChange: (patch: Partial<CompaniesSearch>) => void
}

/**
 * One route, three states driven by `GET /platform/status`: disabled by the
 * server, locked (ask for the password) or unlocked (the companies table). A
 * `platform_locked` answer from any request flips the status, so re-locking
 * needs no navigation.
 */
export function PlatformHome({ search, onSearchChange }: PlatformHomeProps) {
  const status = usePlatformStatus()

  if (status.isPending) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-64 w-full rounded-xl' />
      </div>
    )
  }

  if (status.isError) {
    return (
      <p role='alert' className='text-muted-foreground text-sm'>
        No se pudo consultar el estado de la consola.{' '}
        <Button
          variant='link'
          className='h-auto p-0'
          onClick={() => void status.refetch()}
        >
          Reintentar
        </Button>
      </p>
    )
  }

  if (!status.data.enabled) return <DisabledScreen />
  if (!status.data.unlocked) return <UnlockScreen status={status.data} />

  return <CompaniesScreen search={search} onSearchChange={onSearchChange} />
}
