import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import {
  UpdateAssignmentSettingsSchema,
  type AssignmentSettings,
  type UpdateAssignmentSettingsInput,
} from '@chat-crm/contracts'
import { toast } from 'sonner'
import { contractResolver } from '@/lib/contract-resolver'
import { useMemberRole } from '@/hooks/use-member-role'
import { Field, FormSection } from '@/components/form-kit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getAssignmentSettings,
  updateAssignmentSettings,
} from '@/services/company.service'
import { SaveBar } from '../components/save-bar'
import { SwitchList, SwitchRow } from '../components/switch-row'
import { ASSIGNMENT_COPY, SAVED_TOAST } from '../copy'

export const ASSIGNMENT_KEY = ['company', 'assignment'] as const

type AssignmentValues = {
  autoAssignEnabled: boolean
  autoAssignMaxOpen: string
  autoAssignSticky: boolean
  autoAssignNotifySupervisors: boolean
}

const FORM_ID = 'assignment-form'

export function toAssignmentPayload(
  values: AssignmentValues
): UpdateAssignmentSettingsInput {
  return {
    ...values,
    autoAssignMaxOpen:
      values.autoAssignMaxOpen.trim() === ''
        ? Number.NaN
        : Number(values.autoAssignMaxOpen),
  }
}

const valuesOf = (settings: AssignmentSettings): AssignmentValues => ({
  ...settings,
  autoAssignMaxOpen: String(settings.autoAssignMaxOpen),
})

export function AssignmentForm() {
  const settings = useQuery({
    queryKey: ASSIGNMENT_KEY,
    queryFn: getAssignmentSettings,
  })

  if (settings.isPending) return <Skeleton className='h-80 w-full rounded-xl' />

  if (settings.isError) {
    return (
      <p className='text-muted-foreground text-sm'>
        {ASSIGNMENT_COPY.loadFailed}{' '}
        <Button
          variant='link'
          className='h-auto p-0'
          onClick={() => void settings.refetch()}
        >
          {ASSIGNMENT_COPY.retry}
        </Button>
      </p>
    )
  }

  return <AssignmentFields current={settings.data} />
}

export function AssignmentFields({ current }: { current: AssignmentSettings }) {
  const { isAdmin } = useMemberRole()
  const queryClient = useQueryClient()
  const defaults = useMemo(() => valuesOf(current), [current])

  const form = useForm<AssignmentValues>({
    values: defaults,
    resetOptions: { keepDirtyValues: true },
    resolver: contractResolver<AssignmentValues>(
      UpdateAssignmentSettingsSchema,
      { toPayload: toAssignmentPayload }
    ),
  })
  const { control, register, handleSubmit, reset, formState } = form
  const { errors, isDirty } = formState

  const save = useMutation({
    mutationFn: (values: AssignmentValues) =>
      updateAssignmentSettings(toAssignmentPayload(values)),
    onSuccess: (saved) => {
      queryClient.setQueryData(ASSIGNMENT_KEY, saved)
      reset(valuesOf(saved))
      toast.success(SAVED_TOAST)
    },
    onError: () => toast.error(ASSIGNMENT_COPY.saveFailed),
  })

  const readOnly = !isAdmin

  const toggle = (
    name: Exclude<keyof AssignmentValues, 'autoAssignMaxOpen'>,
    label: string,
    description: string
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <SwitchRow
          label={label}
          description={description}
          checked={field.value}
          disabled={readOnly}
          onCheckedChange={field.onChange}
        />
      )}
    />
  )

  return (
    <div className='space-y-10'>
      {readOnly ? (
        <p
          role='note'
          className='text-muted-foreground bg-muted/50 rounded-lg border px-4 py-3 text-sm'
        >
          {ASSIGNMENT_COPY.readOnly}
        </p>
      ) : null}

      <form
        id={FORM_ID}
        noValidate
        onSubmit={handleSubmit((values) => save.mutate(values))}
        className='space-y-8'
      >
        <FormSection title={ASSIGNMENT_COPY.section}>
          <SwitchList>
            {toggle(
              'autoAssignEnabled',
              ASSIGNMENT_COPY.enabled,
              ASSIGNMENT_COPY.enabledHint
            )}
            {toggle(
              'autoAssignSticky',
              ASSIGNMENT_COPY.sticky,
              ASSIGNMENT_COPY.stickyHint
            )}
            {toggle(
              'autoAssignNotifySupervisors',
              ASSIGNMENT_COPY.notify,
              ASSIGNMENT_COPY.notifyHint
            )}
          </SwitchList>

          <Field
            label={ASSIGNMENT_COPY.maxOpen}
            hint={ASSIGNMENT_COPY.maxOpenHint}
            error={errors.autoAssignMaxOpen?.message}
            className='max-w-sm'
          >
            <Input
              type='number'
              inputMode='numeric'
              min={1}
              step={1}
              disabled={readOnly}
              {...register('autoAssignMaxOpen')}
            />
          </Field>
        </FormSection>
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
