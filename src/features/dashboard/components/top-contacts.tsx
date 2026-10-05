import { useQuery } from '@tanstack/react-query'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getTopContacts } from '@/features/dashboard/clients/metrics.client'

export function TopContacts() {
  const { data: contacts = [] } = useQuery({
    queryKey: ['metrics', 'contacts'],
    queryFn: () => getTopContacts,
  })

  return (
    <div className='space-y-8'>
      {contacts.map(({ id, username, label, total }) => {
        const name = username ?? label ?? 'Sin nombre'
        return (
          <div key={id} className='flex items-center gap-4'>
            <Avatar className='h-9 w-9'>
              <AvatarFallback>{name[0]?.toUpperCase() ?? '#'}</AvatarFallback>
            </Avatar>
            <div className='flex flex-1 flex-wrap items-center justify-between'>
              <div className='space-y-1'>
                <p className='text-sm leading-none font-medium'>{name}</p>
                <p className='text-muted-foreground text-sm'>
                  {label || 'Sin información'}
                </p>
              </div>
              <div className='font-medium'>{total} mensajes</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
