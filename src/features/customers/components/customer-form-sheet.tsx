import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
  CreateCustomerSchema,
  UpdateCustomerSchema,
  type CreateCustomerInput,
  type CustomerRow,
  type UpdateCustomerInput,
} from '@chat-crm/contracts'
import { toast } from 'sonner'
import { customerConflictOf } from '@/services/customers.service'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Field, FormSection, FormSheet } from '@/components/form-kit'
import { contractResolver, pickDirty } from '../../workspace/form-utils'
import { copy } from '../copy'
import {
  customerErrorMessage,
  useCreateCustomer,
  useStages,
  useUpdateCustomer,
} from '../customers-data'
import { OwnerPicker } from './owner-picker'
import { StageSelect } from './stage-select'

type FormValues = {
  phoneNumber: string
  displayName: string
  firstName: string
  lastName: string
  email: string
  pipelineStageId: string
  ownerMemberId: string
}

const EMPTY: FormValues = {
  phoneNumber: '',
  displayName: '',
  firstName: '',
  lastName: '',
  email: '',
  pipelineStageId: '',
  ownerMemberId: '',
}

const fromCustomer = (customer: CustomerRow): FormValues => ({
  phoneNumber: customer.phoneNumber ?? '',
  displayName: customer.displayName ?? '',
  firstName: customer.firstName ?? '',
  lastName: customer.lastName ?? '',
  email: customer.email ?? '',
  pipelineStageId: customer.stage?.id ?? '',
  ownerMemberId: customer.owner?.memberId ?? '',
})

/** Creating needs something to identify the person by (UI-only rule). */
const CreateFormSchema = CreateCustomerSchema.refine(
  (value) =>
    Boolean(
      value.phoneNumber ||
        value.displayName ||
        value.firstName ||
        value.lastName ||
        value.email
    ),
  { message: copy.form.atLeastOne, path: ['phoneNumber'] }
)

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present = edit this customer; absent = create one. */
  customer?: CustomerRow | null
  /** "Ver cliente" after a 409: open the existing customer's detail. */
  onViewExisting: (customerId: string) => void
}

/**
 * Create or edit a customer with the shared contract as the only validation.
 * Creating over a deleted phone restores it ("Cliente restaurado"); creating
 * over an active one shows the conflict with a way to open that customer.
 */
export function CustomerFormSheet({
  open,
  onOpenChange,
  customer,
  onViewExisting,
}: Props) {
  const isEdit = Boolean(customer)
  const create = useCreateCustomer()
  const update = useUpdateCustomer()
  const stages = useStages()
  const [conflictId, setConflictId] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: contractResolver<FormValues>(
      isEdit ? UpdateCustomerSchema : CreateFormSchema
    ),
    defaultValues: customer ? fromCustomer(customer) : EMPTY,
  })
  const {
    control,
    register,
    handleSubmit,
    getValues,
    reset,
    setError,
    formState: { errors, isDirty, dirtyFields, isSubmitting },
  } = form

  useEffect(() => {
    if (!open) return
    reset(customer ? fromCustomer(customer) : EMPTY)
    setConflictId(null)
  }, [open, customer, reset])

  const submit = handleSubmit(async (values) => {
    setConflictId(null)
    try {
      if (customer) {
        const changes: UpdateCustomerInput = pickDirty(values, dirtyFields)
        // The resolver drops empty strings; an emptied owner or stage means
        // "clear it", which the update contract spells `null`.
        for (const key of ['ownerMemberId', 'pipelineStageId'] as const) {
          if (dirtyFields[key] && getValues(key) === '') changes[key] = null
        }
        if (Object.keys(changes).length === 0) return onOpenChange(false)

        await update.mutateAsync({ id: customer.id, input: changes })
        toast.success(copy.form.saved)
        onOpenChange(false)
        return
      }

      const result = await create.mutateAsync(values as CreateCustomerInput)
      toast.success(result.restored ? copy.form.restored : copy.form.created)
      onOpenChange(false)
    } catch (error) {
      const conflict = customerConflictOf(error)
      if (conflict) return setConflictId(conflict.customerId)

      const message = customerErrorMessage(error)
      setError('root.server', { message })
    }
  })

  const rootError = errors.root?.server?.message

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
    >
      {conflictId ? (
        <Alert variant='destructive'>
          <AlertDescription className='flex flex-wrap items-center gap-x-3 gap-y-2'>
            <span>{copy.form.exists}</span>
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={() => {
                onOpenChange(false)
                onViewExisting(conflictId)
              }}
            >
              {copy.form.viewExisting}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {rootError ? (
        <Alert variant='destructive'>
          <AlertDescription>{rootError}</AlertDescription>
        </Alert>
      ) : null}

      <FormSection title={copy.form.contact}>
        <Controller
          control={control}
          name='phoneNumber'
          render={({ field }) => (
            <Field
              label={copy.form.phone}
              optional={isEdit}
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
        <Field label={copy.form.displayName} optional error={errors.displayName?.message}>
          <Input autoComplete='off' {...register('displayName')} />
        </Field>
        <div className='grid gap-4 sm:grid-cols-2'>
          <Field label={copy.form.firstName} optional error={errors.firstName?.message}>
            <Input autoComplete='off' {...register('firstName')} />
          </Field>
          <Field label={copy.form.lastName} optional error={errors.lastName?.message}>
            <Input autoComplete='off' {...register('lastName')} />
          </Field>
        </div>
        <Field label={copy.form.email} optional error={errors.email?.message}>
          <Input type='email' autoComplete='off' {...register('email')} />
        </Field>
      </FormSection>

      <FormSection title={copy.form.follow} columns={2}>
        <Controller
          control={control}
          name='pipelineStageId'
          render={({ field }) => (
            <Field label={copy.form.stage} optional error={errors.pipelineStageId?.message}>
              <StageSelect
                value={field.value}
                stages={stages.data ?? []}
                placeholder={copy.form.stagePlaceholder}
                noneLabel={isEdit ? copy.noStage : undefined}
                onChange={(id) => field.onChange(id ?? '')}
              />
            </Field>
          )}
        />
        <Controller
          control={control}
          name='ownerMemberId'
          render={({ field }) => (
            <Field label={copy.form.owner} optional error={errors.ownerMemberId?.message}>
              <OwnerPicker
                value={field.value}
                valueLabel={customer?.owner?.name}
                placeholder={copy.form.ownerPlaceholder}
                noneLabel={isEdit ? copy.noOwner : undefined}
                onChange={(id) => field.onChange(id ?? '')}
              />
            </Field>
          )}
        />
      </FormSection>
    </FormSheet>
  )
}
