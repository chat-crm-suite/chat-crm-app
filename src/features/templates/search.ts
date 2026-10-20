import { z } from 'zod'
import { TemplateStatusSchema } from '@chat-crm/contracts'

/**
 * URL search params of `/templates`: text filter, channel and status filters
 * and `template=<id>` (opens its detail sheet).
 */
export const TemplatesSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  channel: z.string().optional().catch(undefined),
  status: TemplateStatusSchema.optional().catch(undefined),
  template: z.string().optional().catch(undefined),
})

export type TemplatesSearch = z.infer<typeof TemplatesSearchSchema>
