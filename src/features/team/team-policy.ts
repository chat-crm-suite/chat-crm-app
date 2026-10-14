import { MEMBER_ROLES, type MemberRole, type MemberStatus } from '@chat-crm/contracts'

/**
 * Client copy of the API's `TeamPolicy` (company-members/team.policy.ts): it
 * only decides which actions to offer and why one is unavailable. The server
 * stays the authority and answers 403 `team_*` / 409 `last_admin` regardless.
 *
 * - admin: any member, any role;
 * - supervisor: only `agent` members, and never grants another role;
 * - agent: nothing;
 * - nobody acts on themselves here (own data lives in the profile).
 */
export type TeamActor = { memberId: string | null; role: MemberRole | null }
export type TeamTarget = { memberId: string; role: MemberRole }

export type TeamDenial = 'self' | 'role' | 'grant' | 'last_admin'
export type TeamDecision =
  | { allowed: true }
  | { allowed: false; reason: TeamDenial }

const ALLOWED: TeamDecision = { allowed: true }
const deny = (reason: TeamDenial): TeamDecision => ({ allowed: false, reason })

/** Whether the actor may add a member with `role`. */
export function canCreateMember(
  actor: TeamActor,
  role: MemberRole
): TeamDecision {
  if (actor.role === 'admin') return ALLOWED
  if (actor.role === 'supervisor') return role === 'agent' ? ALLOWED : deny('grant')
  return deny('role')
}

/**
 * Whether the actor may edit, suspend, reset the password of or delete the
 * target. `change.role` is the role an edit would assign, if any.
 */
export function canManage(
  actor: TeamActor,
  target: TeamTarget,
  change: { role?: MemberRole } = {}
): TeamDecision {
  if (actor.memberId === target.memberId) return deny('self')
  if (actor.role === 'admin') return ALLOWED
  if (actor.role !== 'supervisor') return deny('role')
  if (target.role !== 'agent') return deny('role')
  if (change.role && change.role !== 'agent') return deny('grant')
  return ALLOWED
}

/**
 * Whether taking the target out of play (suspend, deactivate, delete, demote)
 * would leave the company without admins. `adminCount` is the number of admins
 * in the company (header counters); it can overcount suspended ones, so this
 * is only a hint: the server decides with the real active count.
 */
export function wouldLeaveWithoutAdmin(
  target: { role: MemberRole; status: MemberStatus },
  adminCount: number
): boolean {
  return target.role === 'admin' && target.status === 'active' && adminCount <= 1
}

/** Roles the actor may pick in the create/edit form. */
export function assignableRoles(actor: TeamActor): MemberRole[] {
  if (actor.role === 'admin') return [...MEMBER_ROLES]
  if (actor.role === 'supervisor') return ['agent']
  return []
}

export type TeamActions = Record<
  'edit' | 'resetPassword' | 'toggleStatus' | 'remove',
  TeamDecision
>

/**
 * Everything the row menu offers for one member, each with its verdict.
 * Suspending or deleting the only admin is denied on top of the role rules.
 */
export function teamActionsFor(
  actor: TeamActor,
  member: { id: string; role: MemberRole; status: MemberStatus },
  adminCount: number
): TeamActions {
  const manage = canManage(actor, { memberId: member.id, role: member.role })
  const takesAdminOut =
    manage.allowed && wouldLeaveWithoutAdmin(member, adminCount)
  const outOfPlay: TeamDecision = takesAdminOut ? deny('last_admin') : manage

  return {
    edit: manage,
    resetPassword: manage,
    toggleStatus: member.status === 'active' ? outOfPlay : manage,
    remove: outOfPlay,
  }
}
