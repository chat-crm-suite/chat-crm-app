import type { UserRoles } from '@/features/users/data/schema'
import { type LucideIcon, UserCheck, Users, Hammer, UserStar, Server } from 'lucide-react'

const trnl: Record<UserRoles, string> = {
  admin: 'Administrador',
  support: 'Soporte',
  supervisor: 'Supervisor',
  agent: 'Agente',
  system: 'Sistema'
}

export const roles: Record<UserRoles, { label: string, value: UserRoles, icon: LucideIcon }> = {
  'admin': {
    label: trnl['admin'] ?? 'Admin',
    value: 'admin',
    icon: UserCheck,
  },
  'supervisor': {
    label: trnl['supervisor'] ?? 'Supervisor',
    value: 'supervisor',
    icon: Users,
  },
  'support': {
    label: trnl['support'] ?? 'Support',
    value: 'support',
    icon: Hammer,
  },
  'agent': {
    label: trnl['agent'] ?? 'Agent',
    value: 'agent',
    icon: UserStar
  },
  'system': {
    label: trnl['system'] ?? 'Sistema',
    value: 'system',
    icon: Server
  }
} as const
