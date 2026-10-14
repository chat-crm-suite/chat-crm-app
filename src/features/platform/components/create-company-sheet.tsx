import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FormProvider, useForm } from 'react-hook-form'
import {
  PlatformCreateCompanySchema,
  type PlatformCreateCompanyInput,
  type PlatformCreateCompanyResult,
} from '@chat-crm/contracts'
import { toast } from 'sonner'
import { contractResolver } from '@/lib/contract-resolver'
import { Field, FormSection, FormSheet, SecretRevealCard } from '@/components/form-kit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createPlatformCompany, isPlatformLocked } from '@/services/platform.service'
import { CREATE_COPY, outcomeText } from '../copy'
import {
  browserTimezone,
  CompanyFields,
  companyBasePayload,
  type CompanyBaseValues,
} from './company-fields'

type CreateValues = CompanyBaseValues & {
  admin: { email: string; firstName: string; lastName: string }
}

const emptyValues = (): CreateValues => ({
  name: '',
  email: '',
  phoneNumber: '',
  address: '',
  timezone: browserTimezone(),
  admin: { email: '', firstName: '', lastName: '' },
})

/** The admin block only counts when something was typed in it. */
export function toCreatePayload(values: CreateValues): PlatformCreateCompanyInput {
  const { email, firstName, lastName } = values.admin
  const hasAdmin = [email, firstName, lastName].some((v) => v.trim() !== '')

  return {
    ...companyBasePayload(values),
    name: values.name.trim(),
    admin: hasAdmin
      ? {
          email: email.trim(),
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
        }
      : undefined,
  }
}

type Props = { open: boolean; onOpenChange: (open: boolean) => void }

export function CreateCompanySheet({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient()
  const [result, setResult] = useState<PlatformCreateCompanyResult | null>(null)
  const [adminLabel, setAdminLabel] = useState('')

  const form = useForm<CreateValues>({
    defaultValues: emptyValues(),
    resolver: contractResolver<CreateValues>(PlatformCreateCompanySchema, {
      toPayload: toCreatePayload,
    }),
  })
  const { register, handleSubmit, reset, formState } = form
  const { errors } = formState

  const create = useMutation({
    mutationFn: (values: CreateValues) =>
      createPlatformCompany(toCreatePayload(values)),
    onSuccess: (created, values) => {
      void queryClient.invalidateQueries({ queryKey: ['platform', 'companies'] })
      toast.success(CREATE_COPY.created(created.company.name))
      setAdminLabel(
        values.admin.firstName.trim() || values.admin.email.trim() || ''
      )
      setResult(created)
    },
    onError: (error) => {
      if (!isPlatformLocked(error)) toast.error(CREATE_COPY.failed)
    },
  })

  const close = () => {
    onOpenChange(false)
    setResult(null)
    reset(emptyValues())
  }

  // A generated password can only be seen now: closing waits for "Listo".
  const secretPending = Boolean(result?.initialPassword)

  const adminEmail = result ? (create.variables?.admin.email.trim() ?? '') : ''

  return (
    <FormSheet
      open={open}
      onOpenChange={(next) => {
        if (next) return onOpenChange(true)
        if (secretPending) return
        close()
      }}
      title={CREATE_COPY.title}
      description={CREATE_COPY.description}
      submitLabel={CREATE_COPY.submit}
      submitting={create.isPending}
      isDirty={formState.isDirty}
      onSubmit={handleSubmit((values) => create.mutate(values))}
      resultTitle={CREATE_COPY.resultTitle}
      result={
        result ? (
          result.initialPassword ? (
            <SecretRevealCard
              secret={result.initialPassword}
              lostHint='Si se pierde, un administrador de la empresa podrá generar una nueva desde Equipo.'
              title={CREATE_COPY.passwordTitle(adminLabel)}
              description={
                <>
                  {outcomeText('created', adminEmail, result.company.name)}{' '}
                  {CREATE_COPY.passwordDescription(result.company.name)}
                </>
              }
              onDone={close}
            />
          ) : (
            <div className='space-y-5'>
              <p className='text-sm text-pretty'>
                {result.adminOutcome
                  ? outcomeText(result.adminOutcome, adminEmail, result.company.name)
                  : CREATE_COPY.noAdmin}
              </p>
              <Button className='w-full' onClick={close}>
                {CREATE_COPY.done}
              </Button>
            </div>
          )
        ) : undefined
      }
    >
      <FormProvider {...form}>
        <CompanyFields />
      </FormProvider>

      <FormSection
        title={CREATE_COPY.adminSection}
        description={CREATE_COPY.adminDescription}
      >
        <Field
          label={CREATE_COPY.adminEmail}
          optional
          error={errors.admin?.email?.message}
        >
          <Input type='email' autoComplete='off' {...register('admin.email')} />
        </Field>
        <div className='grid gap-4 sm:grid-cols-2'>
          <Field
            label={CREATE_COPY.adminFirstName}
            optional
            error={errors.admin?.firstName?.message}
          >
            <Input autoComplete='off' {...register('admin.firstName')} />
          </Field>
          <Field
            label={CREATE_COPY.adminLastName}
            optional
            error={errors.admin?.lastName?.message}
          >
            <Input autoComplete='off' {...register('admin.lastName')} />
          </Field>
        </div>
      </FormSection>
    </FormSheet>
  )
}
