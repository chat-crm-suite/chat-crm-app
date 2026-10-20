import { useMemo } from 'react'
import { useCommandContext } from '@/lib/use-command-context'
import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { useWorkBadge } from '@/features/tasks/use-work-badge'
import { buildSidebarGroups } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { TeamSwitcher } from './team-switcher'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const context = useCommandContext()
  const work = useWorkBadge()
  const groups = useMemo(
    () =>
      buildSidebarGroups(context, {
        '/tasks': work > 0 ? (work > 99 ? '99+' : String(work)) : undefined,
      }),
    [context, work]
  )

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <NavGroup key={group.title} {...group} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
