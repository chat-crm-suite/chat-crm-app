import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Controller,
  FormProvider,
  useForm,
  type Control,
} from 'react-hook-form'
import {
  PlatformUpdateCompanySchema,
  type CompanyStatus,
  type PlatformCompanyRow,
  type PlatformUpdateCompanyInput,
} from '@chat-crm/contracts'
import { toast } from 'sonner'
import { contractResolver } from '@/lib/contract-resolver'
import { Field, FormSection, FormSheet } from '@/components/form-kit'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  isPlatformLocked,
  updatePlatformCompany,
} from '@/services/platform.service'
import { EDIT_COPY, STATUS_LABELS } from '../copy'
import { CompanyFields, companyBasePayload, type CompanyBaseValues } from './company-fields'

type EditValues = CompanyBaseValues & { status: CompanyStatus }

const STATUSES: CompanyStatus[] = ['active', 'inactive', 'suspended']

const valuesOf = (company: PlatformCompanyRow): EditValues => ({
  name: company.name,
  email: company.email ?? '',
  phoneNumber: company.phoneNumber ?? '',
  address: company.address ?? '',
  timezone: company.timezone,
  status: company.status,
})

export function toEditPayload(values: EditValues): PlatformUpdateCompanyInput {
  return { ...companyBasePayload(values), status: values.status }
}

type Props = {
  company: PlatformCompanyRow | null
  onOpenChange: (open: boolean) => void
}

/** The sheet is mounted per company, so its form always starts from that row. */
export function EditCompanySheet({ company, onOpenChange }: Props) {
  if (!company) return null
  return (
    <EditForm key={company.id} company={company} onOpenChange={onOpenChange} />
  )
}

function EditForm({
  company,
  onOpenChange,
}: {
  company: PlatformCompanyRow
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const defaults = useMemo(() => valuesOf(company), [company])

  const form = useForm<EditValues>({
    defaultValues: defaults,
    resolver: contractResolver<EditValues>(PlatformUpdateCompanySchema, {
      toPayload: toEditPayload,
    }),
  })
  const { control, handleSubmit, watch, formState } = form
  const status = watch('status')

  const save = useMutation({
    mutationFn: (values: EditValues) =>
      updatePlatformCompany(company.id, toEditPayload(values)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform', 'companies'] })
      toast.success(EDIT_COPY.saved)
      onOpenChange(false)
    },
    onError: (error) => {
      if (!isPlatformLocked(error)) toast.error(EDIT_COPY.failed)
    },
  })

  return (
    <FormSheet
      open
      onOpenChange={onOpenChange}
      title={`${EDIT_COPY.title}: ${company.name}`}
      submitLabel={EDIT_COPY.submit}
      submitting={save.isPending}
      isDirty={formState.isDirty}
      onSubmit={handleSubmit((values) => save.mutate(values))}
    >
      <FormProvider {...form}>
        <CompanyFields />
      </FormProvider>

      <FormSection title={EDIT_COPY.status}>
        <Field label={EDIT_COPY.status} hint={EDIT_COPY.statusHint[status]}>
          <StatusSelect control={control} />
        </Field>
      </FormSection>
    </FormSheet>
  )
}

/** Takes the id/aria props `Field` injects and hands them to the trigger. */
function StatusSelect({
  control,
  ...aria
}: {
  control: Control<EditValues>
  id?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}) {
  return (
    <Controller
      control={control}
      name='status'
      render={({ field }) => (
        <Select
          value={field.value}
          onValueChange={(value) => field.onChange(value as CompanyStatus)}
        >
          <SelectTrigger className='w-full' {...aria}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  )
}
