import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
  CreateMemberSchema,
  UpdateMemberSchema,
  type CreateMemberInput,
  type CreateMemberResult,
  type MemberRole,
  type TeamMemberRow,
} from '@chat-crm/contracts'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Field, FormSection, FormSheet } from '@/components/form-kit'
import { getApiError } from '../../workspace/api-error-code'
import { contractResolver, pickDirty } from '../../workspace/form-utils'
import { API_ERROR_COPY, API_ERROR_FIELD, ROLE_HELP, ROLE_LABEL, copy } from '../copy'
import {
  memberName,
  useCreateMember,
  useUpdateMember,
} from '../team-mutations'
import { assignableRoles, type TeamActor } from '../team-policy'
import { deriveUsername } from '../derive-username'
import { MemberResult } from './member-result'

type FormValues = {
  email: string
  username: string
  firstName: string
  lastName: string
  phoneNumber: string
  role: MemberRole
  acceptsAutoAssign: boolean
  maxOpenConversations: number | null
}

const EMPTY: FormValues = {
  email: '',
  username: '',
  firstName: '',
  lastName: '',
  phoneNumber: '',
  role: 'agent',
  acceptsAutoAssign: true,
  maxOpenConversations: null,
}

const fromMember = (member: TeamMemberRow): FormValues => ({
  email: member.email ?? '',
  username: member.username,
  firstName: member.firstName ?? '',
  lastName: member.lastName ?? '',
  phoneNumber: member.phoneNumber ?? '',
  role: member.role,
  acceptsAutoAssign: member.acceptsAutoAssign,
  maxOpenConversations: member.maxOpenConversations ?? null,
})

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  actor: TeamActor
  /** Present = edit this member; absent = add a new one. */
  member?: TeamMemberRow | null
}

/**
 * Add or edit one member. Adding ends on a result step that depends on what the
 * server did (created: one-time password; linked; restored); editing sends
 * only the fields that changed.
 */
export function MemberFormSheet({ open, onOpenChange, actor, member }: Props) {
  const isEdit = Boolean(member)
  const createMember = useCreateMember()
  const updateMember = useUpdateMember()
  const [result, setResult] = useState<CreateMemberResult | null>(null)
  const roles = assignableRoles(actor)

  const form = useForm<FormValues>({
    // Editing: an emptied name or phone is sent as '' (it blanks the value).
    resolver: contractResolver<FormValues>(
      isEdit ? UpdateMemberSchema : CreateMemberSchema,
      { keepEmpty: isEdit ? ['firstName', 'lastName', 'phoneNumber'] : [] }
    ),
    defaultValues: member ? fromMember(member) : EMPTY,
  })
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isDirty, dirtyFields, isSubmitting },
  } = form

  useEffect(() => {
    if (!open) return
    reset(member ? fromMember(member) : EMPTY)
    setResult(null)
  }, [open, member, reset])

  const email = watch('email')
  const derived = useMemo(() => deriveUsername(email), [email])
  const rootError = errors.root?.server?.message

  const onApiError = (error: unknown) => {
    const { code } = getApiError(error)
    const message = (code && API_ERROR_COPY[code]) || copy.genericError
    const field = code ? API_ERROR_FIELD[code] : undefined

    if (field) setError(field, { message })
    else setError('root.server', { message })
  }

  const submit = handleSubmit(async (values) => {
    try {
      if (member) {
        const changes = pickDirty(values, dirtyFields)
        // The update schema already left out email and username.
        if (Object.keys(changes).length === 0) return onOpenChange(false)

        await updateMember.mutateAsync({ id: member.id, input: changes })
        toast.success(copy.form.savedToast)
        onOpenChange(false)
        return
      }

      // The resolver already dropped the empty optional fields.
      setResult(await createMember.mutateAsync(values as CreateMemberInput))
    } catch (error) {
      onApiError(error)
    }
  })

  const newName = result ? memberName(result.member) : ''

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? copy.form.editTitle : copy.form.createTitle}
      description={isEdit ? undefined : copy.form.createDescription}
      submitLabel={isEdit ? copy.form.editSubmit : copy.form.createSubmit}
      submitting={isSubmitting}
      isDirty={isDirty}
      onSubmit={submit}
      resultTitle={result ? resultTitle(result) : undefined}
      result={
        result ? (
          <MemberResult
            result={result}
            name={newName}
            onDone={() => onOpenChange(false)}
          />
        ) : null
      }
    >
      {rootError ? (
        <Alert variant='destructive'>
          <AlertDescription>{rootError}</AlertDescription>
        </Alert>
      ) : null}

      <FormSection title={copy.form.account}>
        {isEdit ? (
          <ReadOnly label={copy.form.email} value={member?.email ?? '—'} />
        ) : (
          <Field label={copy.form.email} error={errors.email?.message}>
            <Input
              type='email'
              autoComplete='off'
              autoFocus
              placeholder='ana@empresa.com'
              {...register('email')}
            />
          </Field>
        )}
        {isEdit ? (
          <ReadOnly label={copy.form.username} value={`@${member?.username}`} />
        ) : (
          <Field
            label={copy.form.username}
            optional
            hint={copy.form.usernameHint(derived)}
            error={errors.username?.message}
          >
            <Input
              autoComplete='off'
              autoCapitalize='none'
              placeholder={derived ?? 'ana-perez'}
              {...register('username')}
            />
          </Field>
        )}
      </FormSection>

      <FormSection title={copy.form.person} columns={2}>
        <Field label={copy.form.firstName} optional error={errors.firstName?.message}>
          <Input autoComplete='off' {...register('firstName')} />
        </Field>
        <Field label={copy.form.lastName} optional error={errors.lastName?.message}>
          <Input autoComplete='off' {...register('lastName')} />
        </Field>
        <Controller
          control={control}
          name='phoneNumber'
          render={({ field }) => (
            <Field
              className='sm:col-span-2'
              label={copy.form.phone}
              optional
              error={errors.phoneNumber?.message}
            >
              <PhoneInput
                value={field.value}
                onChange={field.onChange}
                defaultCountry='PE'
                placeholder='987 654 321'
              />
            </Field>
          )}
        />
      </FormSection>

      <FormSection title={copy.form.work}>
        <Controller
          control={control}
          name='role'
          render={({ field }) => (
            <Field
              label={copy.form.role}
              hint={ROLE_HELP[field.value]}
              error={errors.role?.message}
            >
              <RoleSelect
                value={field.value}
                onChange={field.onChange}
                options={roles.includes(field.value) ? roles : [field.value, ...roles]}
                disabled={roles.length <= 1 && roles[0] === field.value}
              />
            </Field>
          )}
        />
        <Controller
          control={control}
          name='maxOpenConversations'
          render={({ field }) => (
            <Field
              label={copy.form.capacity}
              optional
              hint={copy.form.capacityHint}
              error={errors.maxOpenConversations?.message}
            >
              <Input
                type='number'
                inputMode='numeric'
                min={1}
                placeholder={copy.form.capacityPlaceholder}
                value={field.value ?? ''}
                onChange={(event) =>
                  field.onChange(
                    event.target.value === '' ? null : Number(event.target.value)
                  )
                }
              />
            </Field>
          )}
        />
        <Controller
          control={control}
          name='acceptsAutoAssign'
          render={({ field }) => (
            <div className='flex items-start justify-between gap-4 rounded-lg border p-3'>
              <div className='space-y-0.5'>
                <Label htmlFor='member-auto-assign' className='text-sm font-medium'>
                  {copy.form.autoAssign}
                </Label>
                <p className='text-muted-foreground text-[13px]'>
                  {copy.form.autoAssignHint}
                </p>
              </div>
              <Switch
                id='member-auto-assign'
                checked={field.value}
                onCheckedChange={field.onChange}
                className='mt-0.5'
              />
            </div>
          )}
        />
      </FormSection>
    </FormSheet>
  )
}

function resultTitle(result: CreateMemberResult) {
  if (result.outcome === 'created') return copy.result.createdTitle
  if (result.outcome === 'linked') return copy.result.linkedTitle
  return copy.result.restoredTitle
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className='space-y-1.5'>
      <p className='text-sm font-medium'>{label}</p>
      <p className='text-muted-foreground text-sm break-all'>{value}</p>
    </div>
  )
}

function RoleSelect({
  id,
  value,
  onChange,
  options,
  disabled,
}: {
  id?: string
  value: MemberRole
  onChange: (value: MemberRole) => void
  options: MemberRole[]
  disabled?: boolean
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as MemberRole)}
      disabled={disabled}
    >
      <SelectTrigger id={id} className='w-full'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((role) => (
          <SelectItem key={role} value={role}>
            {ROLE_LABEL[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
