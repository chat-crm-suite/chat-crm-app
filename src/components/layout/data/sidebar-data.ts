import { sidebarGroups, type CommandContext } from '@/lib/commands'
import { type NavGroup } from '../types'

/**
 * Sidebar groups for the person's role. Built from the command registry so the
 * sidebar, the settings nav and Ctrl+K always agree on what exists and who may
 * see it.
 */
export function buildSidebarGroups(context: CommandContext): NavGroup[] {
  return sidebarGroups(context).map((group) => ({
    title: group.title,
    items: group.items.flatMap((command) =>
      command.kind === 'navigate'
        ? [{ title: command.title, url: command.to, icon: command.icon }]
        : []
    ),
  }))
}
