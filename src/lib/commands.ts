import type { MemberRole } from '@chat-crm/contracts'
import {
  Bell,
  Building2,
  CalendarClock,
  Contact,
  KeyRound,
  LayoutDashboard,
  LayoutTemplate,
  ListTodo,
  Lock,
  MessageSquare,
  MessagesSquare,
  Palette,
  Settings,
  ShieldCheck,
  Shuffle,
  SwatchBook,
  UserPlus,
  UserRound,
  UserRoundPlus,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'

/**
 * Command registry: the single source for the sidebar, the settings nav and
 * Ctrl+K. Every surface reads the same entries, filtered by the person's role
 * in the active company and by the platform-admin flag, so a page can never
 * show up in one place and be missing (or leaking) in another.
 *
 * Titles are user-facing Spanish. The registry is plain data (no hooks) so it
 * can be unit-tested; `useCommandContext` builds the context from the stores.
 */

export type CommandContext = {
  /** Role in the active company (platform admins act as `admin`). */
  role: MemberRole | null
  isPlatformAdmin: boolean
  /** Only known after `GET /platform/status`; gates "Bloquear consola". */
  platformUnlocked?: boolean
}

/** Group a command belongs to in Ctrl+K. */
export type CommandSection = 'navigation' | 'settings' | 'actions' | 'platform'

export type SettingsGroupId = 'personal' | 'company' | 'integrations'

export type SidebarGroupId = 'general' | 'account'

type CommandBase = {
  id: string
  title: string
  icon: LucideIcon
  section: CommandSection
  /** Extra words that should find the command ("clave" finds "Seguridad"). */
  keywords?: readonly string[]
  /** Company roles allowed to see it; omitted = everyone. */
  roles?: readonly MemberRole[]
  platformAdminOnly?: boolean
  /** Extra visibility rule evaluated against the context. */
  when?: (context: CommandContext) => boolean
  /** Shown in the sidebar under this group. */
  sidebar?: SidebarGroupId
  /** Shown in the settings nav under this group. */
  settingsGroup?: SettingsGroupId
}

export type NavigateCommand = CommandBase & {
  kind: 'navigate'
  to: string
  /** Search params to open an inline surface (e.g. the "new customer" sheet). */
  search?: Record<string, unknown>
}

export type ActionCommand = CommandBase & {
  kind: 'action'
  action: 'change-theme' | 'lock-platform'
}

export type CommandDef = NavigateCommand | ActionCommand

const SUPERVISION: readonly MemberRole[] = ['admin', 'supervisor']

export const COMMANDS: readonly CommandDef[] = [
  // Navigation (also the sidebar's main group).
  {
    id: 'nav.dashboard',
    kind: 'navigate',
    title: 'Panel',
    to: '/',
    icon: LayoutDashboard,
    section: 'navigation',
    keywords: ['dashboard', 'analitica', 'metricas', 'inicio'],
    sidebar: 'general',
  },
  {
    id: 'nav.chats',
    kind: 'navigate',
    title: 'Chats',
    to: '/chats',
    icon: MessagesSquare,
    section: 'navigation',
    keywords: ['conversaciones', 'mensajes', 'whatsapp'],
    sidebar: 'general',
  },
  {
    id: 'nav.customers',
    kind: 'navigate',
    title: 'Clientes',
    to: '/customers',
    icon: Contact,
    section: 'navigation',
    keywords: ['contactos', 'personas'],
    sidebar: 'general',
  },
  {
    id: 'nav.team',
    kind: 'navigate',
    title: 'Equipo',
    to: '/team',
    icon: UsersRound,
    section: 'navigation',
    keywords: ['miembros', 'agentes', 'usuarios', 'supervisores'],
    roles: SUPERVISION,
    sidebar: 'general',
  },
  {
    id: 'nav.tasks',
    kind: 'navigate',
    title: 'Tareas',
    to: '/tasks',
    icon: ListTodo,
    section: 'navigation',
    keywords: ['mi trabajo', 'avisos', 'pendientes', 'seguimiento'],
    sidebar: 'general',
  },
  {
    id: 'nav.templates',
    kind: 'navigate',
    title: 'Plantillas',
    to: '/templates',
    icon: LayoutTemplate,
    section: 'navigation',
    keywords: ['whatsapp', 'hsm', 'mensajes aprobados', 'meta'],
    sidebar: 'general',
  },

  // Settings: one entry per section; the sidebar only links to the first.
  {
    id: 'nav.settings',
    kind: 'navigate',
    title: 'Ajustes',
    to: '/settings',
    icon: Settings,
    section: 'navigation',
    keywords: ['configuracion', 'preferencias'],
    sidebar: 'account',
  },
  {
    id: 'settings.profile',
    kind: 'navigate',
    title: 'Perfil',
    to: '/settings',
    icon: UserRound,
    section: 'settings',
    keywords: ['foto', 'avatar', 'nombre', 'telefono', 'correo', 'cuenta'],
    settingsGroup: 'personal',
  },
  {
    id: 'settings.security',
    kind: 'navigate',
    title: 'Seguridad',
    to: '/settings/security',
    icon: KeyRound,
    section: 'settings',
    keywords: ['contrasena', 'clave', 'sesiones', 'password'],
    settingsGroup: 'personal',
  },
  {
    id: 'settings.notifications',
    kind: 'navigate',
    title: 'Notificaciones',
    to: '/settings/notifications',
    icon: Bell,
    section: 'settings',
    keywords: ['avisos', 'sonido', 'alertas'],
    settingsGroup: 'personal',
  },
  {
    id: 'settings.appearance',
    kind: 'navigate',
    title: 'Apariencia',
    to: '/settings/appearance',
    icon: Palette,
    section: 'settings',
    keywords: ['tema', 'oscuro', 'claro', 'texto', 'tamano'],
    settingsGroup: 'personal',
  },
  {
    id: 'settings.company',
    kind: 'navigate',
    title: 'Datos de la empresa',
    to: '/settings/company',
    icon: Building2,
    section: 'settings',
    keywords: ['empresa', 'zona horaria', 'direccion', 'razon social'],
    roles: SUPERVISION,
    settingsGroup: 'company',
  },
  {
    id: 'settings.service',
    kind: 'navigate',
    title: 'Horario y atención',
    to: '/settings/service',
    icon: CalendarClock,
    section: 'settings',
    keywords: ['horario', 'sla', 'respuesta', 'atencion'],
    roles: SUPERVISION,
    settingsGroup: 'company',
  },
  {
    id: 'settings.assignment',
    kind: 'navigate',
    title: 'Asignación automática',
    to: '/settings/assignment',
    icon: Shuffle,
    section: 'settings',
    keywords: ['reparto', 'cola', 'agentes', 'capacidad'],
    roles: SUPERVISION,
    settingsGroup: 'company',
  },
  {
    id: 'settings.whatsapp',
    kind: 'navigate',
    title: 'WhatsApp',
    to: '/settings/integrations/whatsapp',
    icon: MessageSquare,
    section: 'settings',
    keywords: ['integraciones', 'canal', 'meta', 'token', 'webhook'],
    roles: SUPERVISION,
    settingsGroup: 'integrations',
  },

  // Actions
  {
    id: 'action.new-customer',
    kind: 'navigate',
    title: 'Nuevo cliente',
    to: '/customers',
    search: { new: true },
    icon: UserPlus,
    section: 'actions',
    keywords: ['crear', 'agregar', 'contacto'],
  },
  {
    id: 'action.add-member',
    kind: 'navigate',
    title: 'Agregar miembro',
    to: '/team',
    search: { new: true },
    icon: UserRoundPlus,
    section: 'actions',
    keywords: ['crear', 'invitar', 'agente', 'usuario', 'equipo'],
    roles: SUPERVISION,
  },
  {
    id: 'action.change-theme',
    kind: 'action',
    action: 'change-theme',
    title: 'Cambiar tema',
    icon: SwatchBook,
    section: 'actions',
    keywords: ['oscuro', 'claro', 'apariencia', 'modo'],
  },
  {
    id: 'action.lock-platform',
    kind: 'action',
    action: 'lock-platform',
    title: 'Bloquear consola',
    icon: Lock,
    section: 'actions',
    keywords: ['plataforma', 'cerrar'],
    platformAdminOnly: true,
    when: (context) => context.platformUnlocked === true,
  },

  // Platform console
  {
    id: 'platform.console',
    kind: 'navigate',
    title: 'Consola de plataforma',
    to: '/platform',
    icon: ShieldCheck,
    section: 'platform',
    keywords: ['superadmin', 'empresas', 'administrar'],
    platformAdminOnly: true,
  },
]

/** True when the context may see the command. */
export function isCommandVisible(
  command: CommandDef,
  context: CommandContext
): boolean {
  if (command.platformAdminOnly && !context.isPlatformAdmin) return false
  if (
    command.roles &&
    !(context.role && command.roles.includes(context.role))
  ) {
    return false
  }
  if (command.when && !command.when(context)) return false
  return true
}

/** Every command the context may see, in registry order. */
export function visibleCommands(context: CommandContext): CommandDef[] {
  return COMMANDS.filter((command) => isCommandVisible(command, context))
}

/** Ctrl+K entries of one group. */
export function commandsInSection(
  context: CommandContext,
  section: CommandSection
): CommandDef[] {
  return visibleCommands(context).filter((c) => c.section === section)
}

export const SIDEBAR_GROUP_TITLES: Record<SidebarGroupId, string> = {
  general: 'General',
  account: 'Cuenta',
}

export type SidebarGroup = {
  id: SidebarGroupId
  title: string
  items: CommandDef[]
}

/** Sidebar groups; empty groups are dropped. */
export function sidebarGroups(context: CommandContext): SidebarGroup[] {
  const visible = visibleCommands(context)
  return (Object.keys(SIDEBAR_GROUP_TITLES) as SidebarGroupId[])
    .map((id) => ({
      id,
      title: SIDEBAR_GROUP_TITLES[id],
      items: visible.filter((command) => command.sidebar === id),
    }))
    .filter((group) => group.items.length > 0)
}

export const SETTINGS_GROUP_TITLES: Record<SettingsGroupId, string> = {
  personal: 'Personal',
  company: 'Empresa',
  integrations: 'Integraciones',
}

export type SettingsGroup = {
  id: SettingsGroupId
  title: string
  items: NavigateCommand[]
}

/** Settings nav groups; the Empresa groups vanish for agents. */
export function settingsGroups(context: CommandContext): SettingsGroup[] {
  const visible = visibleCommands(context)
  return (Object.keys(SETTINGS_GROUP_TITLES) as SettingsGroupId[])
    .map((id) => ({
      id,
      title: SETTINGS_GROUP_TITLES[id],
      items: visible.filter(
        (command): command is NavigateCommand =>
          command.kind === 'navigate' && command.settingsGroup === id
      ),
    }))
    .filter((group) => group.items.length > 0)
}

/** Lowercase, accent-free text so "contrasena" finds "Contraseña". */
export function normalizeSearchText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Every word typed must appear somewhere in the given texts. */
export function matchesText(texts: readonly string[], query: string): boolean {
  const words = normalizeSearchText(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true

  const haystack = normalizeSearchText(texts.join(' '))
  return words.every((word) => haystack.includes(word))
}

/** A command matches when every typed word is in its title or keywords. */
export function matchesCommand(command: CommandDef, query: string): boolean {
  return matchesText([command.title, ...(command.keywords ?? [])], query)
}
