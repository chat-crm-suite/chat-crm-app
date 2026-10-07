import type { Chat } from '../types/chat.domain'

/**
 * A conversation is unassigned when the local queue marker says so or the
 * needs-response payload carries no owner (`member === null`). An omitted
 * `member` means the inbox payload: those conversations belong to the
 * signed-in member. Header and case rail must agree on this predicate, or a
 * claimed chat keeps offering "Tomar chat".
 */
export function isConversationUnassigned(
  chat: Pick<Chat, 'isUnassigned' | 'member'>
): boolean {
  return Boolean(chat.isUnassigned || chat.member === null)
}
