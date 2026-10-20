import { describe, expect, it } from 'vitest'
import {
  commandsInSection,
  matchesCommand,
  settingsGroups,
  sidebarGroups,
  visibleCommands,
  COMMANDS,
  type CommandContext,
} from './commands'

const admin: CommandContext = { role: 'admin', isPlatformAdmin: false }
const supervisor: CommandContext = { role: 'supervisor', isPlatformAdmin: false }
const agent: CommandContext = { role: 'agent', isPlatformAdmin: false }
const platformAdmin: CommandContext = { role: 'admin', isPlatformAdmin: true }

const ids = (commands: { id: string }[]) => commands.map((c) => c.id)

describe('command registry', () => {
  it('has unique ids and Spanish titles', () => {
    expect(new Set(COMMANDS.map((c) => c.id)).size).toBe(COMMANDS.length)
    expect(COMMANDS.every((c) => c.title.trim().length > 0)).toBe(true)
  })

  it('hides Equipo and its action from agents, shows them to supervisors and admins', () => {
    for (const context of [admin, supervisor]) {
      expect(ids(visibleCommands(context))).toEqual(
        expect.arrayContaining(['nav.team', 'action.add-member'])
      )
    }
    expect(ids(visibleCommands(agent))).not.toContain('nav.team')
    expect(ids(visibleCommands(agent))).not.toContain('action.add-member')
  })

  it('shows Clientes and "Nuevo cliente" to every role', () => {
    for (const context of [admin, supervisor, agent]) {
      expect(ids(visibleCommands(context))).toEqual(
        expect.arrayContaining(['nav.customers', 'action.new-customer'])
      )
    }
  })

  it('shows the platform console only to platform admins', () => {
    expect(ids(visibleCommands(admin))).not.toContain('platform.console')
    expect(ids(commandsInSection(admin, 'platform'))).toEqual([])
    expect(ids(commandsInSection(platformAdmin, 'platform'))).toEqual([
      'platform.console',
    ])
  })

  it('offers "Bloquear consola" only to platform admins with an unlocked console', () => {
    expect(ids(visibleCommands(platformAdmin))).not.toContain(
      'action.lock-platform'
    )
    expect(
      ids(visibleCommands({ ...platformAdmin, platformUnlocked: true }))
    ).toContain('action.lock-platform')
    expect(
      ids(visibleCommands({ ...admin, platformUnlocked: true }))
    ).not.toContain('action.lock-platform')
  })

  it('builds the sidebar from the same entries, filtered by role', () => {
    const titles = (context: CommandContext) =>
      sidebarGroups(context).flatMap((g) => g.items.map((i) => i.title))

    expect(titles(admin)).toEqual(
      expect.arrayContaining(['Panel', 'Chats', 'Clientes', 'Equipo', 'Tareas', 'Ajustes'])
    )
    expect(titles(agent)).not.toContain('Equipo')
    expect(titles(agent)).toEqual(expect.arrayContaining(['Chats', 'Clientes']))
  })

  it('groups settings and drops the Empresa groups for agents', () => {
    expect(settingsGroups(admin).map((g) => g.id)).toEqual([
      'personal',
      'company',
      'integrations',
    ])
    // Channel credentials are admin-only: no Integraciones for supervisors.
    expect(settingsGroups(supervisor).map((g) => g.id)).toEqual([
      'personal',
      'company',
    ])
    expect(settingsGroups(agent).map((g) => g.id)).toEqual(['personal'])
    expect(
      settingsGroups(agent)[0].items.map((item) => item.title)
    ).toEqual(['Perfil', 'Seguridad', 'Notificaciones', 'Apariencia'])
  })

  it('returns nothing for a user without a role', () => {
    const context: CommandContext = { role: null, isPlatformAdmin: false }
    expect(ids(visibleCommands(context))).not.toContain('nav.team')
    expect(settingsGroups(context).map((g) => g.id)).toEqual(['personal'])
  })

  it('matches by title and keywords ignoring accents and case', () => {
    const security = COMMANDS.find((c) => c.id === 'settings.security')!
    expect(matchesCommand(security, 'SEGURIDAD')).toBe(true)
    expect(matchesCommand(security, 'contraseña')).toBe(true)
    expect(matchesCommand(security, 'clave seg')).toBe(true)
    expect(matchesCommand(security, 'factura')).toBe(false)

    const hours = COMMANDS.find((c) => c.id === 'settings.service')!
    expect(matchesCommand(hours, 'atencion')).toBe(true)
  })
})
