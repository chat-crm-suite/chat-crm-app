import { Check, ChevronsUpDown } from 'lucide-react'
import { Chip, MonogramAvatar } from '@/components/data-grid'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { MAX_SHORTCUT_COMPANIES, useCompanySwitch } from './company-switch'
import { modifierKeyLabel, ROLE_LABELS } from './copy'

/**
 * Who the person is working for. With several companies it opens a menu to
 * switch (Ctrl/Cmd + 1..9 does the same); with one company it only names it,
 * since there is nothing to choose.
 */
export function TeamSwitcher() {
  const { isMobile } = useSidebar()
  const { companies, active, switchTo } = useCompanySwitch()

  if (!active) return null

  const identity = (
    <>
      <MonogramAvatar
        name={active.companyName}
        tintKey={active.companyId}
        size='md'
        className='rounded-lg'
      />
      <div className='grid flex-1 text-start text-sm leading-tight'>
        <span className='truncate font-semibold'>{active.companyName}</span>
        <span className='text-sidebar-foreground truncate text-xs'>
          {ROLE_LABELS[active.role]}
        </span>
      </div>
    </>
  )

  if (companies.length < 2) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size='lg'
            asChild
            className='cursor-default hover:bg-transparent active:bg-transparent'
          >
            <div aria-label={`Empresa: ${active.companyName}`}>{identity}</div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  const modifier = modifierKeyLabel()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              aria-label={`Empresa activa: ${active.companyName}. Cambiar de empresa`}
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              {identity}
              <ChevronsUpDown className='ms-auto' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg'
            align='start'
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className='text-muted-foreground text-xs font-normal'>
              Cambiar de empresa
            </DropdownMenuLabel>
            {companies.map((membership, index) => {
              const isActive = membership.companyId === active.companyId
              return (
                <DropdownMenuItem
                  key={membership.companyId}
                  onSelect={() => switchTo(membership.companyId)}
                  className='gap-2.5 p-2'
                >
                  <MonogramAvatar
                    name={membership.companyName}
                    tintKey={membership.companyId}
                    size='sm'
                    className='rounded-md'
                  />
                  <span className='min-w-0 flex-1'>
                    <span className='block truncate text-sm font-medium'>
                      {membership.companyName}
                    </span>
                    <Chip className='mt-0.5 h-5 px-1.5 text-[11px]'>
                      {ROLE_LABELS[membership.role]}
                    </Chip>
                  </span>
                  {isActive ? (
                    <Check aria-label='Empresa activa' className='size-4' />
                  ) : index < MAX_SHORTCUT_COMPANIES ? (
                    <DropdownMenuShortcut>
                      {modifier} {index + 1}
                    </DropdownMenuShortcut>
                  ) : null}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
