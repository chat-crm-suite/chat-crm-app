import { z } from 'zod'

const optionalText = z.string().optional()
const optionalEmail = z.union([z.literal(''), z.email('Correo inválido')]).optional()

export const setupAdminSchema = z
  .object({
    username: z
      .string()
      .min(3, 'El usuario debe tener al menos 3 caracteres'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(8, 'Confirma la contraseña'),
    firstName: optionalText,
    lastName: optionalText,
    email: optionalEmail,
    phoneNumber: optionalText,
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  })

export const setupCompanySchema = z.object({
  name: z.string().min(1, 'El nombre de la empresa es obligatorio'),
  email: optionalEmail,
  phoneNumber: optionalText,
  address: optionalText,
})

export const setupWhatsappSchema = z.object({
  businessId: optionalText,
  accessToken: optionalText,
  phoneNumberId: optionalText,
  apiVersion: optionalText,
})

export const setupFormSchema = z
  .object({
    setupToken: optionalText,
    requireSetupToken: z.boolean(),
    admin: setupAdminSchema,
    company: setupCompanySchema,
    connectWhatsapp: z.boolean(),
    whatsapp: setupWhatsappSchema,
  })
  .superRefine((data, ctx) => {
    if (data.requireSetupToken && !data.setupToken?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['setupToken'],
        message: 'El token de configuración es obligatorio',
      })
    }

    if (!data.connectWhatsapp) return

    if (!data.whatsapp.accessToken?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['whatsapp', 'accessToken'],
        message: 'El access token es obligatorio',
      })
    }
    if (!data.whatsapp.phoneNumberId?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['whatsapp', 'phoneNumberId'],
        message: 'El phone number id es obligatorio',
      })
    }
  })

export type SetupFormValues = z.infer<typeof setupFormSchema>

export const setupFormDefaults: SetupFormValues = {
  setupToken: '',
  requireSetupToken: false,
  admin: {
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
  },
  company: {
    name: '',
    email: '',
    phoneNumber: '',
    address: '',
  },
  connectWhatsapp: false,
  whatsapp: {
    businessId: '',
    accessToken: '',
    phoneNumberId: '',
    apiVersion: '',
  },
}
