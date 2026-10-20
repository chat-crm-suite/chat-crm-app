import { useEffect } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CHANNEL_STATUS,
  CONNECTION_CHECK,
  WHATSAPP_WEBHOOK_PATH,
  type ConnectionCheck,
  type UpdateChannelInput,
  type WhatsAppConnectionTest,
} from '@chat-crm/contracts'
import {
  defaultValues,
  isApiVersion,
  schema,
  versions,
  type WhatsAppConfigInput,
} from '@/schemas/whatsapp-config.schema'
import {
  getConfig,
  saveConfig,
  testConnection,
} from '@/services/whatsapp.service'
import { API_PUBLIC_URL } from '@/lib/http'
import { Info, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { SCREEN_HANDLES_ERRORS } from '@/lib/handle-server-error'
import { notify } from '@/lib/notify'
import { useAuthStore } from '@/stores/auth-store'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { LoadingButton } from '@/components/ui/loading-button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CopyIconButton } from '@/components/button-copy-icon'
import { InputEndAddOn } from '@/components/input-end-add-on'
import { PasswordInput } from '@/components/input-password'

const WEBHOOK_PATH = `/${WHATSAPP_WEBHOOK_PATH}`

/** Labels of the connection test checks, in the order they are reported. */
const TEST_CHECKS = {
  sending: 'Envío',
  webhook: 'Webhook',
  subscription: 'Suscripción en Meta',
} as const satisfies Record<
  keyof Omit<WhatsAppConnectionTest, 'ok'>,
  string
>

/**
 * TODO(backend): persist only the domain for webhookUrl and append
 * WEBHOOK_PATH server-side. Today the API stores the full URL, so the form
 * splits it on load and joins it on save for backward compatibility.
 */
const splitWebhookUrl = (url?: string) => {
  const value = url?.trim() ?? ''
  if (!value) return ''
  return value.endsWith(WEBHOOK_PATH)
    ? value.slice(0, -WEBHOOK_PATH.length)
    : value
}

const joinWebhookUrl = (base?: string) => {
  const value = base?.trim().replace(/\/+$/, '') ?? ''
  if (!value) return ''
  return value.endsWith(WEBHOOK_PATH) ? value : `${value}${WEBHOOK_PATH}`
}

/** One toast listing every invalid field (the fields also show inline). */
const onInvalidSubmit = (errors: FieldErrors<WhatsAppConfigInput>) => {
  const messages = Object.values(errors)
    .map((error) => error?.message)
    .filter((message): message is string => Boolean(message))
  if (!messages.length) return

  notify.error(
    messages.length === 1 ? messages[0] : `Revisa ${messages.length} campos`,
    {
      id: 'whatsapp:invalid',
      description: messages.length > 1 ? messages.join(' · ') : undefined,
    }
  )
}

/**
 * One toast per test run (same id, so a second run replaces it): verified,
 * or what failed / could not be checked, all in its description.
 */
const toastTestResult = (result: WhatsAppConnectionTest) => {
  const problems = (
    Object.entries(TEST_CHECKS) as [keyof typeof TEST_CHECKS, string][]
  ).flatMap(([key, label]) => {
    const check: ConnectionCheck = result[key]
    if (check.status === CONNECTION_CHECK.failed) {
      return [{ failed: true, text: `${label}: falla. ${check.message ?? ''}`.trim() }]
    }
    if (check.status === CONNECTION_CHECK.skipped) {
      return [{ failed: false, text: `${label}: sin comprobar. ${check.message ?? ''}`.trim() }]
    }
    return []
  })

  if (result.ok && !problems.length) {
    notify.success('Conexión de WhatsApp verificada', {
      id: TEST_TOAST_ID,
      description: result.sending.message,
    })
    return
  }

  const description = problems.map((problem) => problem.text).join(' · ')
  if (problems.some((problem) => problem.failed)) {
    notify.error('La conexión de WhatsApp tiene problemas', { id: TEST_TOAST_ID, description })
  } else {
    notify.warning(
      result.ok ? 'Conexión verificada con avisos' : 'No se pudo comprobar todo',
      { id: TEST_TOAST_ID, description }
    )
  }
}

const TEST_TOAST_ID = 'whatsapp:test'

export const WhatsappForm = () => {
  const { id: businessId } = useAuthStore().auth.company!

  // Get data config (company travels in the x-company-id header; businessId
  // only keys the query cache).
  const { data, isLoading } = useQuery({
    queryKey: ['whatsapp', 'config', businessId],
    queryFn: () => getConfig(businessId ?? undefined),
    enabled: !!businessId,
  })

  const form = useForm<WhatsAppConfigInput>({
    resolver: zodResolver(schema),
    // A channel without a saved webhook starts from this API's own URL; the
    // domain stays editable (e.g. an ngrok tunnel in development).
    defaultValues: { ...defaultValues, webhookUrl: API_PUBLIC_URL },
  })

  const queryClient = useQueryClient()
  const isPendingChannel = !data || data.status === CHANNEL_STATUS.pending
  // Read during render: react-hook-form only tracks the formState fields a
  // render subscribes to (reading it inside a handler would always be false).
  const { isDirty } = form.formState

  const test = useMutation({
    mutationFn: testConnection,
    onSuccess: toastTestResult,
    onError: (error) =>
      notify.apiError(error, 'No se pudo ejecutar la prueba de conexión', {
        id: TEST_TOAST_ID,
      }),
  })

  const onTest = () => {
    // The API tests what is SAVED: unsaved edits would give a wrong answer.
    if (isDirty) {
      notify.warning('Guarda los cambios antes de probar la conexión', {
        id: TEST_TOAST_ID,
      })
      return
    }
    test.mutate()
  }

  const { mutateAsync, isPending } = useMutation({
    // The submit's `toast.promise` reports the error: no second toast.
    ...SCREEN_HANDLES_ERRORS,
    mutationFn: (vals: WhatsAppConfigInput) => {
      // v2: form fields map onto the channel contract. The access token is
      // prefilled from the API; an empty field means "keep current".
      const payload: UpdateChannelInput = {
        businessId: vals.businessId || undefined,
        externalAccountId: vals.phoneNumberId || undefined,
        apiVersion: vals.apiVersion,
        accessToken: vals.accessToken || undefined,
        appSecret: vals.appSecret || undefined,
        webhookUrl: joinWebhookUrl(vals.webhookUrl) || undefined,
      }
      return saveConfig(businessId!, payload)
    },
    // Refetch: the channel may have turned `active`, and the form resets to
    // what is now saved (so the Test button tests it).
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['whatsapp', 'config', businessId],
      }),
  })

  useEffect(() => {
    if (!data) return

    // Explicit mapping: GET /whatsapp/config returns the stored access token,
    // so the (masked) password input shows what is saved.
    form.reset({
      businessId: data.businessId ?? '',
      phoneNumberId: data.externalAccountId ?? '',
      apiVersion: isApiVersion(data.apiVersion)
        ? data.apiVersion
        : defaultValues.apiVersion,
      accessToken: data.accessToken ?? '',
      webhookVerifyToken: data.webhookVerifyToken ?? '',
      webhookUrl:
        splitWebhookUrl(data.webhookUrl ?? undefined) || API_PUBLIC_URL,
      // Never returned by the API: the field only replaces it.
      appSecret: '',
    })
  }, [data, form])

  return isLoading ? (
    <div className='flex h-8/10 items-center justify-center'>
      <Loader2Icon className='text-muted-foreground h-max w-6 animate-spin' />
    </div>
  ) : (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (vals) => {
          toast.promise(
            mutateAsync({
              ...vals,
              webhookUrl: joinWebhookUrl(vals.webhookUrl),
            }),
            {
              id: 'whatsapp:save',
              loading: 'Guardando configuración…',
              success: 'Configuración guardada',
              error: (error: unknown) =>
                getApiErrorMessage(error, 'No se pudo guardar la configuración'),
            }
          )
        }, onInvalidSubmit)}
        className='flex h-8/10 w-full flex-col justify-between space-y-6'
      >
        {/* Business Information Section */}
        <div className='grid grid-cols-1 gap-4 md:grid-cols-5'>
          <FormField
            control={form.control}
            name='businessId'
            render={({ field }) => (
              <FormItem className='col-span-2'>
                <FormLabel>Business Account ID</FormLabel>
                <Input placeholder='ID de la cuenta de negocio' {...field} />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='phoneNumberId'
            render={({ field }) => (
              <FormItem className='col-span-2'>
                <FormLabel>Phone Number ID</FormLabel>
                <Input placeholder='ID del número de whatsapp' {...field} />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='apiVersion'
            render={({ field }) => {
              const handleSelectChange = (val?: string) => {
                if (!isApiVersion(val)) return
                field.onChange(val)
              }

              return (
                <FormItem>
                  <FormLabel>Versión de API</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={handleSelectChange}
                    defaultValue={field.value}
                  >
                    <FormControl className='w-full'>
                      <SelectTrigger>
                        <SelectValue placeholder={'vXX.X'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {versions.map((version) => (
                        <SelectItem key={version} value={version}>
                          {version}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )
            }}
          />
        </div>

        {/* Security Section */}
        <div className='space-y-4'>
          <div className='space-y-4'>
            <FormField
              control={form.control}
              name='accessToken'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Token</FormLabel>
                  <PasswordInput
                    placeholder={
                      isPendingChannel
                        ? 'Token de acceso de Meta (obligatorio para activar el canal)'
                        : 'Token de acceso de Meta'
                    }
                    {...field}
                  />
                  <FormDescription>
                    {isPendingChannel
                      ? 'Canal pendiente: guarda el Phone Number ID y el access token para activarlo. El webhook ya puede configurarse en Meta.'
                      : data.hasCredentials
                        ? 'Canal configurado: edita el token solo si quieres reemplazarlo.'
                        : 'Canal sin credenciales: introduce el access token para configurarlo.'}
                  </FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='appSecret'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>App Secret</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder={
                        data?.hasAppSecret
                          ? '•••••••• (configurado: escribe uno nuevo para reemplazarlo)'
                          : 'Meta → tu app → App settings → Basic → App secret'
                      }
                      autoComplete='off'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <FormDescription>
                    {data?.hasAppSecret
                      ? 'Configurado ✓. Por seguridad nunca se muestra; déjalo vacío para conservarlo.'
                      : 'Firma los webhooks de tu app de Meta. Sin él, el servidor usa el secreto global (si existe) o rechaza los mensajes entrantes.'}
                  </FormDescription>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Webhook Section */}
        <div className='mb-0 flex-none'>
          <Tooltip>
            <TooltipTrigger className='row flex items-center gap-2'>
              <h3 className='text-lg font-medium'>Webhook Configuration</h3>
              <Info size='16px' />
            </TooltipTrigger>
            <TooltipContent side='right'>
              <p>
                La configuración <b>es solo referencial</b>, <br />
                solo puede actualizarse desde el panel de Meta
              </p>
            </TooltipContent>
          </Tooltip>
          <p className='text-muted-foreground text-sm'>
            Configure endpoints to receive real-time events from external
            services.
          </p>
        </div>
        <Separator className='my-4 flex-none' />
        <div
          data-testid='webhook-url-row'
          className='flex flex-wrap items-start gap-2'
        >
          <FormField
            control={form.control}
            name='webhookUrl'
            render={({ field }) => (
              <FormItem className='min-w-0 flex-1'>
                <FormLabel>Webhook Url</FormLabel>
                <div className='flex flex-wrap items-center gap-2'>
                  <div className='min-w-0 flex-1'>
                    <FormControl>
                      <InputEndAddOn
                        textEnd={WEBHOOK_PATH}
                        type='url'
                        inputMode='url'
                        placeholder='http://tu-domain.com'
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <CopyIconButton
                    text={joinWebhookUrl(form.getValues('webhookUrl'))}
                  />
                </div>
                <FormDescription>
                  Edita solo el dominio; el path del webhook es fijo.
                </FormDescription>
              </FormItem>
            )}
          />
        </div>

        <div
          data-testid='webhook-verify-row'
          className='flex flex-wrap items-start gap-2'
        >
          <FormField
            control={form.control}
            name='webhookVerifyToken'
            render={({ field }) => (
              <FormItem className='min-w-0 flex-1'>
                <FormLabel>Verify Token</FormLabel>
                <div className='flex flex-wrap items-center gap-2'>
                  <div className='min-w-0 flex-1'>
                    <FormControl>
                      <PasswordInput
                        placeholder='********'
                        readOnly={true}
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <CopyIconButton
                    text={form.getValues('webhookVerifyToken') ?? ''}
                  />
                </div>
              </FormItem>
            )}
          />
        </div>

        {/* Buttons Actions */}
        <div className='flex justify-end gap-4'>
          <LoadingButton
            type='button'
            size='lg'
            variant='secondary'
            loading={test.isPending}
            disabled={isPending}
            onClick={onTest}
            style={{ padding: '0.5rem 1rem' }}
          >
            Test
          </LoadingButton>
          <LoadingButton type='submit' loading={isPending}>
            Guardar
          </LoadingButton>
        </div>
      </form>
    </Form>
  )
}
