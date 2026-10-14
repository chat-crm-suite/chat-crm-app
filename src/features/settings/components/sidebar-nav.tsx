import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import type { SettingsGroup } from '@/lib/commands'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type SidebarNavProps = {
  groups: SettingsGroup[]
}

const normalize = (pathname: string) =>
  pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname

/**
 * Settings sections, grouped by who they are for (me, my company, my
 * integrations). Large screens get a list with the current page marked; small
 * screens get a select, which fits 390px without a horizontal scroller.
 */
export function SidebarNav({ groups }: SidebarNavProps) {
  const pathname = normalize(useLocation({ select: (l) => l.pathname }))
  const navigate = useNavigate()

  const current = groups
    .flatMap((group) => group.items)
    .find((item) => item.to === pathname)

  return (
    <>
      <div className='lg:hidden'>
        <Select
          value={current?.to ?? ''}
          onValueChange={(to) => void navigate({ to } as never)}
        >
          <SelectTrigger
            aria-label='Sección de ajustes'
            className='h-11 w-full sm:w-72'
          >
            <SelectValue placeholder='Elige una sección' />
          </SelectTrigger>
          <SelectContent>
            {groups.map((group) => (
              <SelectGroup key={group.id}>
                <SelectLabel>{group.title}</SelectLabel>
                {group.items.map((item) => (
                  <SelectItem key={item.id} value={item.to}>
                    <item.icon aria-hidden />
                    {item.title}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      <nav aria-label='Ajustes' className='hidden space-y-6 lg:block'>
        {groups.map((group) => (
          <div key={group.id} className='space-y-1'>
            <p
              id={`settings-nav-${group.id}`}
              className='text-muted-foreground px-3 pb-1 text-[13px] font-medium'
            >
              {group.title}
            </p>
            <ul aria-labelledby={`settings-nav-${group.id}`} className='space-y-0.5'>
              {group.items.map((item) => {
                const active = item.to === pathname
                return (
                  <li key={item.id}>
                    <Link
                      to={item.to}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'focus-visible:ring-ring flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2',
                        active
                          ? 'bg-muted text-foreground font-medium shadow-[inset_2px_0_0_var(--primary)]'
                          : 'text-foreground/75 hover:bg-muted/60 hover:text-foreground'
                      )}
                    >
                      <item.icon aria-hidden className='size-4 shrink-0' />
                      <span className='truncate'>{item.title}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  )
}
