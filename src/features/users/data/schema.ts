import { z } from 'zod'
import { UserRoleSchema } from '@chat-crm/contracts'

// Canonical roles live in @chat-crm/contracts (shared with the API): the
// previous local list had a drift ('manager' vs the API's 'supervisor').
export const userRoleSchema = UserRoleSchema

export type UserRoles = z.infer<typeof userRoleSchema>

export const userSchema = z.object({
  id: z.string(),
  firstNames: z.string(),
  lastNames: z.string(),
  username: z.string(),
  avatar: z.url(),
  email: z.string(),
  phoneNumber: z.string(),
  status: z.enum(['online', 'offline', 'busy']),
  role: userRoleSchema,
  password: z.string().optional(),
  companyId: z.uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type User = z.infer<typeof userSchema>

export const userListSchema = z.array(userSchema)
