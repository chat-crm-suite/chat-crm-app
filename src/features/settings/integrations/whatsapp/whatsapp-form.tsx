import { useEffect } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  defaultValues,
  isApiVersion,
  schema,
  versions,
  type WhatsAppConfigInput,
} from '@/schemas/whatsapp-config.schema'
import { getConfig, saveConfig } from '@/services/whatsapp.service'
import { Info, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
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

const WEBHOOK_PATH = '/integration/webhook/whatsapp'

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

const onInvalidSubmit = (errors: FieldErrors<WhatsAppConfigInput>) => {
  Object.values(errors).forEach((error) => {
    if (error?.message) toast.error(error.message)
  })
}

export const WhatsappForm = () => {
  const { id: businessId } = useAuthStore().auth.company!

  // Get data config
  const { data, isLoading } = useQuery({
    queryKey: ['whatsapp', 'config', businessId],
    queryFn: () => getConfig(businessId!),
    enabled: !!businessId,
  })

  const form = useForm<WhatsAppConfigInput>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues,
  })

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (vals: WhatsAppConfigInput) => saveConfig(businessId!, vals),
  })

  useEffect(() => {
    if (!data) return

    // Explicit mapping: the response includes contract fields the form does
    // not use (id, timestamps) and the webhook URL is split for display.
    form.reset({
      businessId: data.businessId ?? '',
      phoneNumberId: data.phoneNumberId,
      apiVersion: data.apiVersion,
      accessToken: data.accessToken,
      webhookVerifyToken: data.webhookVerifyToken,
      webhookUrl: splitWebhookUrl(data.webhookUrl),
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
              loading: 'Guardando configuración...',
              success: 'Configuración guardada correctamente 🎉',
              error: 'Ocurrió un error al guardar la configuración ❌',
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
                    placeholder='Token de acceso de Meta'
                    {...field}
                  />
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
          <Button
            type='button'
            size='lg'
            variant='secondary'
            // disabled={loading}
            style={{ padding: '0.5rem 1rem' }}
          >
            Test
          </Button>
          <LoadingButton type='submit' loading={isPending}>
            Guardar
          </LoadingButton>
        </div>
      </form>
    </Form>
  )
}
