import { z } from 'zod'

/**
 * URL search params of `/tasks`: the tab (`team` only means something for
 * admins and supervisors), the agent filter of that tab and the task status
 * filter. Invalid values fall back instead of breaking the page.
 */
export const WorkSearchSchema = z.object({
  tab: z.enum(['mine', 'team']).optional().catch(undefined),
  assignee: z.string().optional().catch(undefined),
  status: z.enum(['open', 'done', 'all']).optional().catch(undefined),
})

export type WorkSearch = z.infer<typeof WorkSearchSchema>
