import type { MemberRole as UserRoles } from '@chat-crm/contracts'
import { type LucideIcon, UserCheck, Users, UserStar } from 'lucide-react'

const trnl: Record<UserRoles, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  agent: 'Agente',
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
  'agent': {
    label: trnl['agent'] ?? 'Agent',
    value: 'agent',
    icon: UserStar
  },
} as const
