import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useForm } from 'react-hook-form'
import { UpdateProfileSchema, type UpdateProfileInput } from '@chat-crm/contracts'
import { toast } from 'sonner'
import { contractResolver } from '@/lib/contract-resolver'
import { useAuthStore } from '@/stores/auth-store'
import { Field, FormSection } from '@/components/form-kit'
import { Input } from '@/components/ui/input'
import { updateProfile } from '@/services/profile.service'
import { PROFILE_COPY, SAVED_TOAST } from '../copy'
import { ControlledPhone } from '../components/controlled-inputs'
import { SaveBar } from '../components/save-bar'
import { syncSessionUser } from '../lib/session-user'
import { AvatarPicker } from './avatar-picker'

type ProfileValues = {
  firstName: string
  lastName: string
  phoneNumber: string
  email: string
}

const FORM_ID = 'profile-form'

/** What the API accepts: the username is never part of it. */
export function toProfilePayload(values: ProfileValues): UpdateProfileInput {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    phoneNumber: values.phoneNumber,
    email: values.email.trim() || undefined,
  }
}

export function ProfileForm() {
  const user = useAuthStore((state) => state.auth.user)
  const queryClient = useQueryClient()

  const defaults = useMemo<ProfileValues>(
    () => ({
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phoneNumber: user?.phoneNumber ?? '',
      email: user?.email ?? '',
    }),
    [user?.firstName, user?.lastName, user?.phoneNumber, user?.email]
  )

  const form = useForm<ProfileValues>({
    defaultValues: defaults,
    resolver: contractResolver<ProfileValues>(UpdateProfileSchema, {
      toPayload: toProfilePayload,
    }),
  })
  const { control, register, handleSubmit, reset, setError, formState } = form

  const save = useMutation({
    mutationFn: (values: ProfileValues) =>
      updateProfile(toProfilePayload(values)),
    onSuccess: (account, values) => {
      syncSessionUser(queryClient, account)
      reset(values)
      toast.success(SAVED_TOAST)
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 409) {
        setError('email', { message: PROFILE_COPY.emailTaken })
        return
      }
      toast.error(PROFILE_COPY.saveFailed)
    },
  })

  if (!user) return null
  const { errors, isDirty } = formState

  return (
    <div className='space-y-10'>
      <AvatarPicker />

      <form
        id={FORM_ID}
        noValidate
        onSubmit={handleSubmit((values) => save.mutate(values))}
        className='space-y-10'
      >
        <FormSection
          title={PROFILE_COPY.personalSection}
          description={PROFILE_COPY.personalSectionHint}
          columns={2}
        >
          <Field
            label={PROFILE_COPY.firstName}
            error={errors.firstName?.message}
          >
            <Input autoComplete='given-name' {...register('firstName')} />
          </Field>
          <Field
            label={PROFILE_COPY.lastName}
            error={errors.lastName?.message}
          >
            <Input autoComplete='family-name' {...register('lastName')} />
          </Field>
          <Field
            label={PROFILE_COPY.phone}
            error={errors.phoneNumber?.message}
          >
            <ControlledPhone control={control} name='phoneNumber' />
          </Field>
          <Field
            label={PROFILE_COPY.email}
            hint={PROFILE_COPY.emailHint}
            error={errors.email?.message}
          >
            <Input type='email' autoComplete='email' {...register('email')} />
          </Field>
        </FormSection>

        <FormSection title='Acceso'>
          <Field label={PROFILE_COPY.username} hint={PROFILE_COPY.usernameHint}>
            <Input value={user.username} readOnly disabled />
          </Field>
        </FormSection>
      </form>

      <SaveBar
        dirty={isDirty}
        saving={save.isPending}
        formId={FORM_ID}
        onDiscard={() => reset(defaults)}
      />
    </div>
  )
}
