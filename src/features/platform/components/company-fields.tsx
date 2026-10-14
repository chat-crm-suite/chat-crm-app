import { useFormContext } from 'react-hook-form'
import type { PlatformUpdateCompanyInput } from '@chat-crm/contracts'
import { Field, FormSection } from '@/components/form-kit'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ControlledPhone,
  ControlledTimezone,
} from '@/features/settings/components/controlled-inputs'
import { CREATE_COPY } from '../copy'

/** Fields shared by the create and edit sheets. */
export type CompanyBaseValues = {
  name: string
  email: string
  phoneNumber: string
  address: string
  timezone: string
}

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** Empty strings mean "not provided": the contract wants them absent. */
export function companyBasePayload(
  values: CompanyBaseValues
): PlatformUpdateCompanyInput {
  return {
    name: values.name.trim(),
    email: values.email.trim() || undefined,
    phoneNumber: values.phoneNumber || undefined,
    address: values.address.trim() || undefined,
    timezone: values.timezone || undefined,
  }
}

/** Needs a `FormProvider` above it. */
export function CompanyFields() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<CompanyBaseValues>()

  return (
    <FormSection title={CREATE_COPY.companySection}>
      <Field label={CREATE_COPY.name} error={errors.name?.message}>
        <Input autoComplete='off' {...register('name')} />
      </Field>
      <Field
        label={CREATE_COPY.email}
        optional
        error={errors.email?.message}
      >
        <Input type='email' autoComplete='off' {...register('email')} />
      </Field>
      <Field
        label={CREATE_COPY.phone}
        optional
        error={errors.phoneNumber?.message}
      >
        <ControlledPhone control={control} name='phoneNumber' />
      </Field>
      <Field
        label={CREATE_COPY.address}
        optional
        error={errors.address?.message}
      >
        <Textarea rows={2} {...register('address')} />
      </Field>
      <Field label={CREATE_COPY.timezone} error={errors.timezone?.message}>
        <ControlledTimezone control={control} name='timezone' />
      </Field>
    </FormSection>
  )
}
