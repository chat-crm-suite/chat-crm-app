import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  useForm,
  useFormContext,
  type ControllerRenderProps,
  type FieldErrors,
  type FieldPath,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Copy, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/input-password'
import {
  setupFormDefaults,
  setupFormSchema,
  type SetupFormValues,
} from '@/schemas/setup.schema'
import {
  getWebhookUrl,
  type SetupPayload,
  type SetupResult,
  type SetupStatus,
} from '@/services/setup.service'
import {
  buildSetupPayload,
  missingSetupSteps,
  type SetupStepId,
} from '../setup-steps'

const STEP_LABELS: Record<SetupStepId, string> = {
  token: 'Acceso',
  admin: 'Administrador',
  company: 'Empresa',
  whatsapp: 'WhatsApp',
}

const STEP_TITLES: Record<SetupStepId, string> = {
  token: 'Token de configuración',
  admin: 'Cuenta de administrador',
  company: 'Datos de la empresa',
  whatsapp: 'Conectar WhatsApp (opcional)',
}

/** Campos que se validan al avanzar desde cada paso. */
const STEP_FIELDS: Record<SetupStepId, FieldName[]> = {
  token: ['setupToken'],
  admin: [
    'admin.username',
    'admin.password',
    'admin.confirmPassword',
    'admin.email',
  ],
  company: ['company.name', 'company.email'],
  whatsapp: ['whatsapp.accessToken', 'whatsapp.phoneNumberId'],
}

type SetupWizardProps = {
  status: SetupStatus
  onSubmit: (payload: SetupPayload) => void | Promise<void>
  isPending?: boolean
  result?: SetupResult | null
  onFinish?: () => void
}

export function SetupWizard({
  status,
  onSubmit,
  isPending = false,
  result = null,
  onFinish,
}: SetupWizardProps) {
  const steps = missingSetupSteps(status)
  const [index, setIndex] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const isFirstRender = useRef(true)

  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupFormSchema),
    defaultValues: {
      ...setupFormDefaults,
      requireSetupToken: status.requiresSetupToken,
    },
    mode: 'onTouched',
  })

  const step = steps[index] ?? 'whatsapp'
  const isLast = index === steps.length - 1
  const webhookUrl = getWebhookUrl()

  // Al cambiar de paso, mueve el foco al título para que lectores de pantalla
  // anuncien el nuevo paso (sin robarlo en el primer render).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    headingRef.current?.focus()
  }, [index])

  if (result) {
    return <SetupSuccess result={result} webhookUrl={webhookUrl} onFinish={onFinish} />
  }

  const focusFirstError = (errors: FieldErrors<SetupFormValues>) => {
    const first = firstErrorPath(errors)
    if (first) void form.setFocus(first as FieldPath<SetupFormValues>)
  }

  const submit = (connectWhatsapp: boolean) =>
    form.handleSubmit(
      (values) =>
        onSubmit(buildSetupPayload({ ...values, connectWhatsapp }, webhookUrl)),
      focusFirstError
    )

  const goNext = async () => {
    const fields = STEP_FIELDS[step]
    const valid = await form.trigger(fields as never)

    if (valid) {
      setIndex((current) => Math.min(current + 1, steps.length - 1))
      return
    }

    const firstInvalid = fields.find((name) => form.getFieldState(name).invalid)
    if (firstInvalid) void form.setFocus(firstInvalid as FieldPath<SetupFormValues>)
  }

  const handleEnter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isPending) return

    if (isLast) {
      void (step === 'whatsapp' ? submit(true)() : submit(false)())
      return
    }

    void goNext()
  }

  return (
    <div className='space-y-6'>
      <ol
        aria-label='Progreso de configuración'
        className='text-muted-foreground flex flex-wrap items-center gap-2 text-sm'
      >
        {steps.map((id, position) => (
          <li
            key={id}
            className='flex items-center gap-2'
            aria-current={position === index ? 'step' : undefined}
          >
            <span
              aria-hidden
              className={
                position <= index
                  ? 'bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full text-xs'
                  : 'bg-muted flex size-6 items-center justify-center rounded-full text-xs'
              }
            >
              {position + 1}
            </span>
            <span
              className={
                position === index ? 'text-foreground font-medium' : undefined
              }
            >
              {STEP_LABELS[id]}
            </span>
            <span className='sr-only'>
              {position < index
                ? ' (completado)'
                : position === index
                  ? ' (paso actual)'
                  : ' (pendiente)'}
            </span>
            {position < steps.length - 1 && <span aria-hidden>/</span>}
          </li>
        ))}
      </ol>

      <Form {...form}>
        <form className='space-y-4' noValidate onSubmit={handleEnter} aria-busy={isPending}>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className='text-lg font-medium outline-none'
          >
            <span className='sr-only'>
              Paso {index + 1} de {steps.length}:{' '}
            </span>
            {STEP_TITLES[step]}
          </h2>

          {step === 'token' && (
            <>
              <p className='text-muted-foreground text-sm'>
                Este servidor pide un token para el primer arranque. Está en la
                variable <code>SETUP_TOKEN</code> del <code>.env</code>, o en
                los logs de la API si no se definió.
              </p>
              <Field name='setupToken' label='Token de configuración'>
                {(field) => (
                  <PasswordInput
                    placeholder='token del servidor'
                    autoComplete='off'
                    {...field}
                  />
                )}
              </Field>
            </>
          )}

          {step === 'admin' && (
            <>
              {status.hasUsers && !status.hasAdmin && (
                <p className='rounded-md border p-3 text-sm'>
                  Ya existe un usuario en el sistema (creado por bootstrap).
                  Introduce su usuario y contraseña para vincularlo a la nueva
                  empresa.
                </p>
              )}
              <div className='grid gap-4 sm:grid-cols-2'>
                <Field name='admin.username' label='Usuario'>
                  {(field) => (
                    <Input
                      placeholder='admin'
                      autoComplete='username'
                      {...field}
                    />
                  )}
                </Field>
                <Field name='admin.email' label='Correo (opcional)'>
                  {(field) => (
                    <Input
                      type='email'
                      placeholder='admin@empresa.com'
                      {...field}
                    />
                  )}
                </Field>
                <Field name='admin.password' label='Contraseña'>
                  {(field) => (
                    <PasswordInput
                      placeholder='Mínimo 8 caracteres'
                      autoComplete='new-password'
                      {...field}
                    />
                  )}
                </Field>
                <Field name='admin.confirmPassword' label='Repetir contraseña'>
                  {(field) => (
                    <PasswordInput
                      placeholder='********'
                      autoComplete='new-password'
                      {...field}
                    />
                  )}
                </Field>
                <Field name='admin.firstName' label='Nombres (opcional)'>
                  {(field) => <Input placeholder='Jeremi' {...field} />}
                </Field>
                <Field name='admin.lastName' label='Apellidos (opcional)'>
                  {(field) => <Input placeholder='Aron' {...field} />}
                </Field>
              </div>
            </>
          )}

          {step === 'company' && (
            <div className='grid gap-4 sm:grid-cols-2'>
              <Field name='company.name' label='Nombre de la empresa'>
                {(field) => (
                  <Input placeholder='J&P Perifericos' {...field} />
                )}
              </Field>
              <Field name='company.email' label='Correo (opcional)'>
                {(field) => (
                  <Input
                    type='email'
                    placeholder='contacto@empresa.com'
                    {...field}
                  />
                )}
              </Field>
              <Field name='company.phoneNumber' label='Teléfono (opcional)'>
                {(field) => <Input placeholder='+51 999 999 999' {...field} />}
              </Field>
              <Field name='company.address' label='Dirección (opcional)'>
                {(field) => <Input placeholder='Av. Siempre Viva 123' {...field} />}
              </Field>
            </div>
          )}

          {step === 'whatsapp' && (
            <>
              <p className='text-muted-foreground text-sm'>
                Pega las credenciales de Meta Cloud API. Puedes dejarlo para
                después desde Ajustes → WhatsApp.
              </p>
              <div className='grid gap-4 sm:grid-cols-2'>
                <Field name='whatsapp.businessId' label='Business Account ID'>
                  {(field) => (
                    <Input placeholder='ID de la cuenta de negocio' {...field} />
                  )}
                </Field>
                <Field name='whatsapp.phoneNumberId' label='Phone Number ID'>
                  {(field) => (
                    <Input placeholder='ID del número de WhatsApp' {...field} />
                  )}
                </Field>
              </div>
              <Field name='whatsapp.accessToken' label='Access Token'>
                {(field) => (
                  <PasswordInput
                    placeholder='Token de acceso de Meta'
                    autoComplete='off'
                    {...field}
                  />
                )}
              </Field>
              <div className='bg-muted/40 rounded-md border p-3 text-sm'>
                <p className='font-medium'>URL de webhook para Meta</p>
                <p className='text-muted-foreground break-all'>{webhookUrl}</p>
                <p className='text-muted-foreground mt-1 text-xs'>
                  El <b>verify token</b> se mostrará al finalizar el setup y en
                  Ajustes → WhatsApp.
                </p>
              </div>
            </>
          )}

          <div
            data-testid='setup-actions'
            className='flex flex-wrap items-center justify-between gap-2 pt-2'
          >
            <Button
              type='button'
              variant='ghost'
              disabled={index === 0 || isPending}
              onClick={() => setIndex((current) => Math.max(current - 1, 0))}
            >
              Atrás
            </Button>

            <div
              data-testid='setup-action-buttons'
              className='flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2'
            >
              {step === 'whatsapp' && (
                <Button
                  type='button'
                  variant='secondary'
                  className='flex-1 sm:flex-none'
                  disabled={isPending}
                  onClick={() => void submit(false)()}
                >
                  {isPending && (
                    <Loader2 aria-hidden className='animate-spin' />
                  )}
                  Saltar y finalizar
                </Button>
              )}

              {isLast && step !== 'whatsapp' && (
                <Button
                  type='button'
                  className='flex-1 sm:flex-none'
                  disabled={isPending}
                  onClick={() => void submit(false)()}
                >
                  {isPending && (
                    <Loader2 aria-hidden className='animate-spin' />
                  )}
                  Finalizar
                </Button>
              )}

              {!isLast && (
                <Button
                  type='button'
                  className='flex-1 sm:flex-none'
                  disabled={isPending}
                  onClick={goNext}
                >
                  Siguiente
                </Button>
              )}

              {isLast && step === 'whatsapp' && (
                <Button
                  type='button'
                  className='flex-1 sm:flex-none'
                  disabled={isPending}
                  onClick={() => void submit(true)()}
                >
                  {isPending && (
                    <Loader2 aria-hidden className='animate-spin' />
                  )}
                  Guardar y finalizar
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}

type FieldName =
  | 'setupToken'
  | 'admin.username'
  | 'admin.email'
  | 'admin.password'
  | 'admin.confirmPassword'
  | 'admin.firstName'
  | 'admin.lastName'
  | 'company.name'
  | 'company.email'
  | 'company.phoneNumber'
  | 'company.address'
  | 'whatsapp.businessId'
  | 'whatsapp.phoneNumberId'
  | 'whatsapp.accessToken'

/** Primer campo con error, respetando el orden de aparición. */
function firstErrorPath(
  errors: FieldErrors,
  prefix = ''
): string | undefined {
  for (const [key, value] of Object.entries(errors)) {
    if (!value) continue

    const path = prefix ? `${prefix}.${key}` : key

    if (typeof value === 'object' && 'message' in value && value.message) {
      return path
    }
    if (typeof value === 'object') {
      const nested = firstErrorPath(value as FieldErrors, path)
      if (nested) return nested
    }
  }
  return undefined
}

type FieldProps = {
  name: FieldName
  label: string
  children: (
    field: ControllerRenderProps<SetupFormValues, FieldName>
  ) => React.ReactNode
}

function Field({ name, label, children }: FieldProps) {
  const { control } = useFormContext<SetupFormValues>()

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>{children(field)}</FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function SetupSuccess({
  result,
  webhookUrl,
  onFinish,
}: {
  result: SetupResult
  webhookUrl: string
  onFinish?: () => void
}) {
  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text)
    toast.success('Copiado')
  }

  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div className='space-y-4 text-center'>
      <CheckCircle2 aria-hidden className='text-primary mx-auto size-12' />
      <h2
        ref={headingRef}
        tabIndex={-1}
        className='text-xl font-medium outline-none'
      >
        ¡Todo listo!
      </h2>
      <p className='text-muted-foreground text-sm'>
        Se creó la empresa <b>{result.company.name}</b>.
      </p>

      {result.channel && (
        <div className='space-y-3 text-start'>
          <div className='bg-muted/40 rounded-md border p-3 text-sm'>
            <p className='font-medium'>URL de webhook</p>
            <div className='flex items-center gap-2'>
              <span className='text-muted-foreground break-all'>
                {webhookUrl}
              </span>
              <Button
                type='button'
                size='icon'
                variant='ghost'
                aria-label='Copiar URL de webhook'
                onClick={() => copy(webhookUrl)}
              >
                <Copy aria-hidden className='size-4' />
              </Button>
            </div>
          </div>
          <div className='bg-muted/40 rounded-md border p-3 text-sm'>
            <p className='font-medium'>Verify token</p>
            <div className='flex items-center gap-2'>
              <span className='text-muted-foreground break-all'>
                {result.channel.webhookVerifyToken ?? ''}
              </span>
              <Button
                type='button'
                size='icon'
                variant='ghost'
                aria-label='Copiar verify token'
                onClick={() => copy(result.channel!.webhookVerifyToken ?? '')}
              >
                <Copy aria-hidden className='size-4' />
              </Button>
            </div>
          </div>
        </div>
      )}

      {onFinish && (
        <Button type='button' className='w-full' onClick={onFinish}>
          Ir al panel
        </Button>
      )}
    </div>
  )
}
