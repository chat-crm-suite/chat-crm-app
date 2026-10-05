import { z } from 'zod'

import {
  DEFAULT_WHATSAPP_API_VERSION,
  WHATSAPP_API_VERSIONS,
  WhatsAppApiVersionSchema,
  type WhatsAppApiVersion,
} from '@chat-crm/contracts'

/**
 * Form-level schema for the WhatsApp configuration screen.
 *
 * The canonical contract lives in `@chat-crm/contracts` (shared with the API):
 * field names, `apiVersion` enum and payload shape come from there. This file
 * only adds form-only strictness (min lengths while typing, empty-string
 * placeholders) plus the react-hook-form defaults.
 */

// Re-exported for the form (select options and guard).
export const versions = WHATSAPP_API_VERSIONS
export const defaultVersion = DEFAULT_WHATSAPP_API_VERSION

const businessIdLength = 15
const phoneNumberIdLength = 15
const tokenLength = 15

// Form schema
export const schema = z.object({
  businessId: z.string().min(businessIdLength).default(''),
  phoneNumberId: z
    .string()
    .min(phoneNumberIdLength)
    .or(z.literal(''))
    .optional(),
  apiVersion: WhatsAppApiVersionSchema.default(DEFAULT_WHATSAPP_API_VERSION),
  accessToken: z.string().min(tokenLength).or(z.literal('')).optional(),
  webhookVerifyToken: z.string().min(6).or(z.literal('')).optional(),
  webhookUrl: z.url().optional().or(z.literal('')),
})

// Guard
export const isApiVersion = (value: unknown): value is WhatsAppApiVersion =>
  WhatsAppApiVersionSchema.safeParse(value).success

// Types
export type WhatsAppConfig = z.infer<typeof schema>
export type WhatsAppConfigInput = Partial<WhatsAppConfig>

// Default form values
export const defaultValues: WhatsAppConfig = {
  businessId: '',
  accessToken: '',
  phoneNumberId: '',
  webhookUrl: '',
  webhookVerifyToken: '',
  apiVersion: DEFAULT_WHATSAPP_API_VERSION,
}
