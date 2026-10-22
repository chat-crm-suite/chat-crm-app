import { describe, expect, it } from 'vitest'
import {
  caseActionsFor,
  isConversationUnassigned,
} from './conversation-assignment'

const owned = (memberId: string) => ({
  assignee: { memberId, userId: `user-${memberId}`, name: 'Ana' },
})

describe('isConversationUnassigned', () => {
  it('is true only without an active owner', () => {
    expect(isConversationUnassigned({ assignee: null })).toBe(true)
    expect(isConversationUnassigned(owned('m-1'))).toBe(false)
  })
})

describe('caseActionsFor', () => {
  it('lets an agent take a queued chat but not assign others', () => {
    const actions = caseActionsFor(
      { assignee: null },
      { role: 'agent', memberId: 'm-1' }
    )
    expect(actions).toMatchObject({
      canTake: true,
      canRelease: false,
      canAssignOthers: false,
      canChangeStatus: false,
    })
  })

  it('lets an agent release and resolve their own chat', () => {
    const actions = caseActionsFor(owned('m-1'), {
      role: 'agent',
      memberId: 'm-1',
    })
    expect(actions).toMatchObject({
      isMine: true,
      canRelease: true,
      canChangeStatus: true,
      canAssignOthers: false,
    })
  })

  it('keeps an agent read-only on a chat owned by someone else', () => {
    const actions = caseActionsFor(owned('m-2'), {
      role: 'agent',
      memberId: 'm-1',
    })
    expect(actions).toMatchObject({
      canTake: false,
      canRelease: false,
      canChangeStatus: false,
      canAssignOthers: false,
    })
  })

  it.each(['admin', 'supervisor'] as const)(
    'gives a %s every action',
    (role) => {
      const actions = caseActionsFor(owned('m-2'), { role, memberId: 'm-1' })
      expect(actions).toMatchObject({
        canRelease: true,
        canAssignOthers: true,
        canChangeStatus: true,
        canSupervise: true,
      })
    }
  )
})
