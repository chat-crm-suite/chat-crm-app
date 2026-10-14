import {
  CreateMemberResultSchema,
  RemoveMemberResultSchema,
  ResetMemberPasswordResultSchema,
  TeamMemberRowSchema,
  TeamTableResponseSchema,
  type CreateMemberInput,
  type CreateMemberResult,
  type RemoveMemberResult,
  type ResetMemberPasswordResult,
  type TeamMemberRow,
  type TeamTableQuery,
  type TeamTableResponse,
  type UpdateMemberInput,
} from '@chat-crm/contracts'
import { client } from '@/lib/http'

const members = client('/company-members')

/** Dev-only runtime check: catches API/contract drift immediately. */
const check = <T>(schema: { parse: (data: unknown) => T }, data: unknown): T =>
  import.meta.env.DEV ? schema.parse(data) : (data as T)

/** One page of Equipo with the role/presence counts of the whole company. */
export const getTeamTable = async (
  query: TeamTableQuery
): Promise<TeamTableResponse> => {
  const { data } = await members.post('/table', query)
  return check(TeamTableResponseSchema, data)
}

/** Creates, links or restores a member; the password only comes on `created`. */
export const createMember = async (
  input: CreateMemberInput
): Promise<CreateMemberResult> => {
  const { data } = await members.post('', input)
  return check(CreateMemberResultSchema, data)
}

export const updateMember = async (
  id: string,
  input: UpdateMemberInput
): Promise<TeamMemberRow> => {
  const { data } = await members.patch(`/${id}`, input)
  return check(TeamMemberRowSchema, data)
}

/** Soft delete; open conversations go back to the unassigned queue. */
export const removeMember = async (id: string): Promise<RemoveMemberResult> => {
  const { data } = await members.delete(`/${id}`)
  return check(RemoveMemberResultSchema, data)
}

/** Generates a new password (shown once) and revokes the member's sessions. */
export const resetMemberPassword = async (
  id: string
): Promise<ResetMemberPasswordResult> => {
  const { data } = await members.post(`/${id}/reset-password`)
  return check(ResetMemberPasswordResultSchema, data)
}
