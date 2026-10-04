import type { SetupFormValues } from '@/schemas/setup.schema'
import type { SetupPayload, SetupStatus } from '@/services/setup.service'

export type SetupStepId = 'admin' | 'company' | 'whatsapp'

/**
 * Pasos que faltan por completar. El usuario huérfano sin empresa no cuenta:
 * el paso de admin se sigue mostrando mientras no exista una membresía admin.
 */
export function missingSetupSteps(status: SetupStatus): SetupStepId[] {
  const steps: SetupStepId[] = []

  if (!status.hasAdmin) steps.push('admin')
  if (!status.hasCompany) steps.push('company')
  if (!status.hasWhatsapp) steps.push('whatsapp')

  return steps
}

/**
 * Decide a dónde llevar al usuario según el estado de inicialización.
 * Devuelve `null` cuando la ruta actual es la correcta.
 */
export function resolveSetupRedirect(
  status: SetupStatus,
  pathname: string
): '/setup' | '/sign-in' | null {
  if (!status.initialized && pathname !== '/setup') return '/setup'
  if (status.initialized && pathname === '/setup') return '/sign-in'
  return null
}

const clean = (value?: string) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function buildSetupPayload(
  values: SetupFormValues,
  webhookUrl: string
): SetupPayload {
  const { admin, company, whatsapp, connectWhatsapp } = values

  return {
    admin: {
      username: admin.username.trim(),
      password: admin.password,
      firstName: clean(admin.firstName),
      lastName: clean(admin.lastName),
      email: clean(admin.email),
      phoneNumber: clean(admin.phoneNumber),
    },
    company: {
      name: company.name.trim(),
      email: clean(company.email),
      phoneNumber: clean(company.phoneNumber),
      address: clean(company.address),
    },
    whatsapp: connectWhatsapp
      ? {
          businessId: clean(whatsapp.businessId),
          accessToken: clean(whatsapp.accessToken),
          phoneNumberId: clean(whatsapp.phoneNumberId),
          webhookUrl,
          apiVersion: clean(whatsapp.apiVersion),
        }
      : undefined,
  }
}
