import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import {
  UpdateCompanyProfileSchema,
  type CompanyProfile,
  type UpdateCompanyProfileInput,
} from '@chat-crm/contracts'
import { toast } from 'sonner'
import { contractResolver } from '@/lib/contract-resolver'
import { useMemberRole } from '@/hooks/use-member-role'
import { Field, FormSection } from '@/components/form-kit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  getCompanyProfile,
  updateCompanyProfile,
} from '@/services/company.service'
import { SaveBar } from '../components/save-bar'
import {
  ControlledPhone,
  ControlledTimezone,
} from '../components/controlled-inputs'
import { COMPANY_COPY, SAVED_TOAST } from '../copy'

export const COMPANY_PROFILE_KEY = ['company', 'profile'] as const

type CompanyValues = {
  name: string
  email: string
  phoneNumber: string
  address: string
  timezone: string
}

const FORM_ID = 'company-form'

export function toCompanyPayload(
  values: CompanyValues
): UpdateCompanyProfileInput {
  return {
    name: values.name.trim(),
    email: values.email.trim() || undefined,
    phoneNumber: values.phoneNumber,
    address: values.address.trim(),
    timezone: values.timezone,
  }
}

const valuesOf = (company: CompanyProfile): CompanyValues => ({
  name: company.name,
  email: company.email ?? '',
  phoneNumber: company.phoneNumber ?? '',
  address: company.address ?? '',
  timezone: company.timezone,
})

/** Loads the active company and hands it to the form. */
export function CompanyForm() {
  const company = useQuery({
    queryKey: COMPANY_PROFILE_KEY,
    queryFn: getCompanyProfile,
  })

  if (company.isPending) return <Skeleton className='h-96 w-full rounded-xl' />

  if (company.isError) {
    return (
      <p className='text-muted-foreground text-sm'>
        {COMPANY_COPY.loadFailed}{' '}
        <Button
          variant='link'
          className='h-auto p-0'
          onClick={() => void company.refetch()}
        >
          {COMPANY_COPY.retry}
        </Button>
      </p>
    )
  }

  return <CompanyFields current={company.data} />
}

/** Admins edit; supervisors see the same data without any way to change it. */
export function CompanyFields({ current }: { current: CompanyProfile }) {
  const { isAdmin } = useMemberRole()
  const queryClient = useQueryClient()
  const defaults = useMemo(() => valuesOf(current), [current])

  const form = useForm<CompanyValues>({
    values: defaults,
    resetOptions: { keepDirtyValues: true },
    resolver: contractResolver<CompanyValues>(UpdateCompanyProfileSchema, {
      toPayload: toCompanyPayload,
    }),
  })
  const { control, register, handleSubmit, reset, formState } = form
  const { errors, isDirty } = formState

  const save = useMutation({
    mutationFn: (values: CompanyValues) =>
      updateCompanyProfile(toCompanyPayload(values)),
    onSuccess: (saved) => {
      queryClient.setQueryData(COMPANY_PROFILE_KEY, saved)
      reset(valuesOf(saved))
      toast.success(SAVED_TOAST)
    },
    onError: () => toast.error(COMPANY_COPY.saveFailed),
  })

  const readOnly = !isAdmin

  return (
    <div className='space-y-10'>
      {readOnly ? (
        <p
          role='note'
          className='text-muted-foreground bg-muted/50 rounded-lg border px-4 py-3 text-sm'
        >
          {COMPANY_COPY.readOnly}
        </p>
      ) : null}

      <form
        id={FORM_ID}
        noValidate
        onSubmit={handleSubmit((values) => save.mutate(values))}
      >
        {/* Read-only keeps the values legible: only the controls stop reacting. */}
        <fieldset
          disabled={readOnly}
          className='min-w-0 border-0 p-0 [&_button:disabled]:opacity-100 [&_input:disabled]:bg-muted/40 [&_input:disabled]:opacity-100 [&_textarea:disabled]:bg-muted/40 [&_textarea:disabled]:opacity-100'
        >
          <FormSection title={COMPANY_COPY.section} columns={2}>
            <Field
              label={COMPANY_COPY.name}
              error={errors.name?.message}
              className='sm:col-span-2'
            >
              <Input autoComplete='organization' {...register('name')} />
            </Field>
            <Field label={COMPANY_COPY.email} error={errors.email?.message}>
              <Input type='email' {...register('email')} />
            </Field>
            <Field
              label={COMPANY_COPY.phone}
              error={errors.phoneNumber?.message}
            >
              <ControlledPhone
                control={control}
                name='phoneNumber'
                disabled={readOnly}
              />
            </Field>
            <Field
              label={COMPANY_COPY.address}
              error={errors.address?.message}
              className='sm:col-span-2'
            >
              <Textarea rows={2} {...register('address')} />
            </Field>
            <Field
              label={COMPANY_COPY.timezone}
              error={errors.timezone?.message}
              className='sm:col-span-2'
            >
              <ControlledTimezone
                control={control}
                name='timezone'
                disabled={readOnly}
              />
            </Field>
          </FormSection>
        </fieldset>
      </form>

      {readOnly ? null : (
        <SaveBar
          dirty={isDirty}
          saving={save.isPending}
          formId={FORM_ID}
          onDiscard={() => reset(defaults)}
        />
      )}
    </div>
  )
}
