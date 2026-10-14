import { z } from 'zod'
import { CustomerTableQuerySchema } from '@chat-crm/contracts'
import { tableSearchShape } from '../workspace/search'

/**
 * URL search params of `/customers`: the table state, `new` (opens the create
 * sheet) and `customer=<id>` (opens that customer's detail; the Ctrl+K command
 * menu navigates with exactly these two).
 */
export const CustomersSearchSchema = z.object({
  ...tableSearchShape,
  stageId: CustomerTableQuerySchema.shape.stageId.catch(undefined),
  ownerMemberId: CustomerTableQuerySchema.shape.ownerMemberId.catch(undefined),
  tagId: CustomerTableQuerySchema.shape.tagId.catch(undefined),
  source: CustomerTableQuerySchema.shape.source.catch(undefined),
  customer: z.string().optional().catch(undefined),
})

export type CustomersSearch = z.infer<typeof CustomersSearchSchema>
