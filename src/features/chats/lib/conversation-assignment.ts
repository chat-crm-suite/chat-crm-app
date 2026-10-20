import type { MemberRole } from '@chat-crm/contracts'
import type { Chat } from '../types/chat.domain'

/** A conversation without an active owner sits in the shared queue. */
export function isConversationUnassigned(
  chat: Pick<Chat, 'assignee'>
): boolean {
  return chat.assignee === null
}

export type CaseActor = {
  role: MemberRole | null
  /** `company_members.id` of the signed-in member. */
  memberId: string | null
}

/** What the signed-in member may do on one conversation. */
export type CaseActions = {
  /** Claim an unassigned conversation for myself. */
  canTake: boolean
  /** Send it back to the queue. */
  canRelease: boolean
  /** Pick any member (assign when free, transfer with note when owned). */
  canAssignOthers: boolean
  /** Resolve / put on hold / reopen. */
  canChangeStatus: boolean
  isMine: boolean
  canSupervise: boolean
}

/**
 * Role policy of the case header and rail. Admins and supervisors manage any
 * conversation; an agent only takes queued chats and releases, resolves or
 * holds their own. The API enforces the same rules (owner, admin or
 * supervisor); this only keeps the UI from offering what would be refused.
 */
export function caseActionsFor(
  chat: Pick<Chat, 'assignee'>,
  actor: CaseActor
): CaseActions {
  const canSupervise = actor.role === 'admin' || actor.role === 'supervisor'
  const unassigned = isConversationUnassigned(chat)
  const isMine = !!actor.memberId && chat.assignee?.memberId === actor.memberId

  return {
    canTake: unassigned,
    canRelease: !unassigned && (isMine || canSupervise),
    canAssignOthers: canSupervise,
    canChangeStatus: isMine || canSupervise,
    isMine,
    canSupervise,
  }
}
