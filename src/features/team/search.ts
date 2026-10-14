import { z } from 'zod'
import { TeamTableQuerySchema } from '@chat-crm/contracts'
import { tableSearchShape } from '../workspace/search'

/** URL search params of `/team`: the table state plus the create-sheet flag. */
export const TeamSearchSchema = z.object({
  ...tableSearchShape,
  role: TeamTableQuerySchema.shape.role.catch(undefined),
  status: TeamTableQuerySchema.shape.status.catch(undefined),
  presence: TeamTableQuerySchema.shape.presence.catch(undefined),
})

export type TeamSearch = z.infer<typeof TeamSearchSchema>
