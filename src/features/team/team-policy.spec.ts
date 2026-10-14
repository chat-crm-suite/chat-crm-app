import { describe, expect, it } from 'vitest'
import {
  assignableRoles,
  canCreateMember,
  canManage,
  teamActionsFor,
  wouldLeaveWithoutAdmin,
} from './team-policy'

const admin = { memberId: 'a1', role: 'admin' as const }
const supervisor = { memberId: 's1', role: 'supervisor' as const }
const agent = { memberId: 'g1', role: 'agent' as const }

describe('team policy', () => {
  describe('canManage', () => {
    it('lets an admin manage any other member', () => {
      expect(canManage(admin, { memberId: 's2', role: 'supervisor' })).toEqual({
        allowed: true,
      })
      expect(canManage(admin, { memberId: 'a2', role: 'admin' })).toEqual({
        allowed: true,
      })
    })

    it('lets a supervisor manage agents only', () => {
      expect(canManage(supervisor, { memberId: 'g2', role: 'agent' })).toEqual({
        allowed: true,
      })
      expect(canManage(supervisor, { memberId: 's2', role: 'supervisor' })).toEqual({
        allowed: false,
        reason: 'role',
      })
      expect(canManage(supervisor, { memberId: 'a1', role: 'admin' })).toEqual({
        allowed: false,
        reason: 'role',
      })
    })

    it('never lets a supervisor promote', () => {
      expect(
        canManage(supervisor, { memberId: 'g2', role: 'agent' }, { role: 'supervisor' })
      ).toEqual({ allowed: false, reason: 'grant' })
      expect(
        canManage(supervisor, { memberId: 'g2', role: 'agent' }, { role: 'agent' })
      ).toEqual({ allowed: true })
    })

    it('denies agents everything', () => {
      expect(canManage(agent, { memberId: 'g2', role: 'agent' })).toEqual({
        allowed: false,
        reason: 'role',
      })
    })

    it('denies acting on yourself, whatever your role', () => {
      expect(canManage(admin, { memberId: 'a1', role: 'admin' })).toEqual({
        allowed: false,
        reason: 'self',
      })
      expect(canManage(supervisor, { memberId: 's1', role: 'agent' })).toEqual({
        allowed: false,
        reason: 'self',
      })
    })
  })

  describe('canCreateMember', () => {
    it('admins add any role, supervisors only agents, agents nothing', () => {
      expect(canCreateMember(admin, 'admin')).toEqual({ allowed: true })
      expect(canCreateMember(supervisor, 'agent')).toEqual({ allowed: true })
      expect(canCreateMember(supervisor, 'supervisor')).toEqual({
        allowed: false,
        reason: 'grant',
      })
      expect(canCreateMember(agent, 'agent')).toEqual({
        allowed: false,
        reason: 'role',
      })
    })
  })

  it('offers each role only the options it may assign', () => {
    expect(assignableRoles(admin)).toEqual(['admin', 'supervisor', 'agent'])
    expect(assignableRoles(supervisor)).toEqual(['agent'])
    expect(assignableRoles(agent)).toEqual([])
  })

  it('flags the only active admin as the last one', () => {
    expect(wouldLeaveWithoutAdmin({ role: 'admin', status: 'active' }, 1)).toBe(true)
    expect(wouldLeaveWithoutAdmin({ role: 'admin', status: 'active' }, 2)).toBe(false)
    expect(wouldLeaveWithoutAdmin({ role: 'agent', status: 'active' }, 1)).toBe(false)
    expect(wouldLeaveWithoutAdmin({ role: 'admin', status: 'suspended' }, 1)).toBe(false)
  })

  describe('teamActionsFor', () => {
    const agentRow = { id: 'g2', role: 'agent' as const, status: 'active' as const }

    it('allows everything an admin can do to another member', () => {
      const actions = teamActionsFor(admin, agentRow, 2)
      expect(Object.values(actions).every((d) => d.allowed)).toBe(true)
    })

    it('denies every action on yourself with the same reason', () => {
      const actions = teamActionsFor(admin, { ...agentRow, id: 'a1', role: 'admin' }, 3)
      expect(Object.values(actions)).toEqual([
        { allowed: false, reason: 'self' },
        { allowed: false, reason: 'self' },
        { allowed: false, reason: 'self' },
        { allowed: false, reason: 'self' },
      ])
    })

    it('keeps edit and reset open but blocks suspend and delete for the only admin', () => {
      const onlyAdmin = { id: 'a2', role: 'admin' as const, status: 'active' as const }
      const actions = teamActionsFor(admin, onlyAdmin, 1)
      expect(actions.edit.allowed).toBe(true)
      expect(actions.resetPassword.allowed).toBe(true)
      expect(actions.toggleStatus).toEqual({ allowed: false, reason: 'last_admin' })
      expect(actions.remove).toEqual({ allowed: false, reason: 'last_admin' })
    })

    it('lets a supervisor act on agents only', () => {
      expect(teamActionsFor(supervisor, agentRow, 2).remove.allowed).toBe(true)
      const actions = teamActionsFor(
        supervisor,
        { id: 'a2', role: 'admin', status: 'active' },
        2
      )
      expect(actions.edit).toEqual({ allowed: false, reason: 'role' })
    })
  })
})
