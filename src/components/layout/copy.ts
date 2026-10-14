import type { MemberRole } from '@chat-crm/contracts'

/** Spanish names of the company roles, shared by the shell and settings. */
export const ROLE_LABELS: Record<MemberRole, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  agent: 'Agente',
}

/** "⌘" on Apple platforms, "Ctrl" elsewhere. */
export function modifierKeyLabel(): string {
  const platform =
    typeof navigator === 'undefined' ? '' : (navigator.platform ?? '')
  return /mac|iphone|ipad/i.test(platform) ? '⌘' : 'Ctrl'
}

/** "Ana Quispe", or the username when the account has no names yet. */
export function userDisplayName(user: {
  username: string
  firstName?: string | null
  lastName?: string | null
}): string {
  const full = [user.firstName, user.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
  return full || user.username
}
