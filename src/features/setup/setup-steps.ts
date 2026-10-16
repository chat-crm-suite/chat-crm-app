import type { WhatsAppApiVersion } from '@chat-crm/contracts'
import type { SetupFormValues } from '@/schemas/setup.schema'
import type {
  SetupPayload,
  SetupStatus,
  ValidateSetupStepInput,
} from '@/services/setup.service'

export type SetupStepId = 'token' | 'admin' | 'company' | 'whatsapp'

/**
 * Pasos que faltan por completar. El usuario huérfano sin empresa no cuenta:
 * el paso de admin se sigue mostrando mientras no exista una membresía admin.
 */
export function missingSetupSteps(status: SetupStatus): SetupStepId[] {
  const steps: SetupStepId[] = []

  if (status.requiresSetupToken) steps.push('token')
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
    setupToken: clean(values.setupToken),
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
      ? // The form superRefine guarantees accessToken/phoneNumberId when
        // `connectWhatsapp` is true; the channel contract names the phone
        // field `externalAccountId`.
        ({
          businessId: clean(whatsapp.businessId),
          accessToken: clean(whatsapp.accessToken),
          externalAccountId: clean(whatsapp.phoneNumberId),
          appSecret: clean(whatsapp.appSecret),
          webhookUrl,
          apiVersion: (clean(whatsapp.apiVersion) ||
            undefined) as WhatsAppApiVersion | undefined,
        } as NonNullable<SetupPayload['whatsapp']>)
      : undefined,
  }
}

/**
 * Body of `POST /setup/validate` for one step, built from the same payload the
 * final `POST /setup` sends (so both checks see identical values).
 */
export function buildStepValidation(
  step: SetupStepId,
  values: SetupFormValues,
  webhookUrl: string
): ValidateSetupStepInput {
  const payload = buildSetupPayload(
    { ...values, connectWhatsapp: step === 'whatsapp' },
    webhookUrl
  )
  const { setupToken } = payload

  switch (step) {
    case 'token':
      return { step, setupToken }
    case 'admin':
      return { step, setupToken, admin: payload.admin }
    case 'company':
      return { step, setupToken, company: payload.company }
    case 'whatsapp':
      return { step, setupToken, whatsapp: payload.whatsapp! }
  }
}

/** Server error paths use the API names; the form calls a few fields differently. */
const SERVER_TO_FORM_PATH: Record<string, string> = {
  'whatsapp.externalAccountId': 'whatsapp.phoneNumberId',
}

export const toFormPath = (serverPath: string): string =>
  SERVER_TO_FORM_PATH[serverPath] ?? serverPath

/** The wizard step that owns a form field. */
export function stepOfPath(path: string): SetupStepId | null {
  if (path === 'setupToken') return 'token'
  const head = path.split('.')[0]
  return head === 'admin' || head === 'company' || head === 'whatsapp'
    ? head
    : null
}
