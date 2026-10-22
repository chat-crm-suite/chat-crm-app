import { useEffect } from 'react'
import { format } from 'date-fns'
import { Controller, useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { searchCompanyMembers } from '@/services/chat.service'
import {
  CreateTaskSchema,
  TASK_PRIORITIES,
  UpdateTaskSchema,
  type CreateTaskInput,
  type Task,
  type TaskPriority,
} from '@chat-crm/contracts'
import { useMemberRole } from '@/hooks/use-member-role'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Field, FormSheet } from '@/components/form-kit'
import { contractResolver } from '@/features/workspace/form-utils'
import { TASK_PRIORITY_LABEL, copy } from '../copy'
import { useCreateTask, useUpdateTask } from '../task-queries'

type FormValues = {
  title: string
  description: string
  priority: TaskPriority
  dueAt: string
  assigneeMemberId: string
}

/** `<input type="datetime-local">` value of a date, in local time. */
const toLocalInput = (date: Date | null | undefined) =>
  date ? format(date, "yyyy-MM-dd'T'HH:mm") : ''

const fromTask = (task: Task): FormValues => ({
  title: task.title,
  description: task.description ?? '',
  priority: task.priority,
  dueAt: toLocalInput(task.dueAt),
  assigneeMemberId: task.assignee.memberId,
})

export type TaskDialogLink = {
  conversationId?: string
  customerId?: string
  /** Shown as context ("Vinculada al chat con Rosa"). */
  customerName?: string | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present = edit this task; absent = create one. */
  task?: Task | null
  /** Link of a new task (from a chat's ⋮ menu or rail). */
  link?: TaskDialogLink
}

/**
 * Create or edit one task. Agents create tasks for themselves; admins and
 * supervisors may assign them to anyone (the API refuses otherwise). Reused
 * from Mi trabajo, the chat ⋮ menu and the rail's "Tareas del chat".
 */
export function TaskDialog({ open, onOpenChange, task, link }: Props) {
  const { canSupervise, memberId } = useMemberRole()
  const create = useCreateTask()
  const update = useUpdateTask()
  const editing = !!task

  const form = useForm<FormValues>({
    resolver: contractResolver<FormValues>(CreateTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      dueAt: '',
      assigneeMemberId: memberId ?? '',
    },
  })
  const { reset } = form

  useEffect(() => {
    if (!open) return
    reset(
      task
        ? fromTask(task)
        : {
            title: '',
            description: '',
            priority: 'medium',
            dueAt: '',
            assigneeMemberId: memberId ?? '',
          }
    )
  }, [open, task, memberId, reset])

  const members = useQuery({
    queryKey: ['company-members', 'all'],
    queryFn: () => searchCompanyMembers(''),
    enabled: open && canSupervise,
    staleTime: 60_000,
  })

  // The resolver only validates: the raw form values (strings) are mapped to
  // the create/update payloads here, then parsed by the shared schemas.
  const submit = form.handleSubmit(async () => {
    const values = form.getValues()
    try {
      if (task) {
        const input = UpdateTaskSchema.parse({
          title: values.title,
          description: values.description.trim() || null,
          priority: values.priority,
          dueAt: values.dueAt ? new Date(values.dueAt) : null,
          ...(canSupervise && values.assigneeMemberId !== task.assignee.memberId
            ? { assigneeMemberId: values.assigneeMemberId }
            : {}),
        })
        await update.mutateAsync({ id: task.id, input })
      } else {
        const input: CreateTaskInput = CreateTaskSchema.parse({
          title: values.title,
          ...(values.description.trim()
            ? { description: values.description }
            : {}),
          priority: values.priority,
          ...(values.dueAt ? { dueAt: new Date(values.dueAt) } : {}),
          ...(canSupervise &&
          values.assigneeMemberId &&
          values.assigneeMemberId !== memberId
            ? { assigneeMemberId: values.assigneeMemberId }
            : {}),
          ...(link?.conversationId
            ? { conversationId: link.conversationId }
            : {}),
          ...(link?.customerId ? { customerId: link.customerId } : {}),
        })
        await create.mutateAsync(input)
      }
      onOpenChange(false)
    } catch {
      // The mutation already toasted the API error; keep the form open.
    }
  })

  const errors = form.formState.errors

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? copy.editTask : copy.newTask}
      description={
        !editing && link?.customerName
          ? copy.formLinkedChat(link.customerName)
          : undefined
      }
      onSubmit={submit}
      submitLabel={editing ? copy.save : copy.create}
      submitting={create.isPending || update.isPending}
      isDirty={form.formState.isDirty}
    >
      <div className='space-y-5'>
        <Field label={copy.formTitle} error={errors.title?.message}>
          <Input
            {...form.register('title')}
            placeholder={copy.formTitlePlaceholder}
            maxLength={160}
            autoFocus
          />
        </Field>
        <Field label={copy.formDescription} optional>
          <Textarea {...form.register('description')} maxLength={2000} />
        </Field>
        <div className='grid gap-5 sm:grid-cols-2'>
          <Field label={copy.formPriority}>
            <Controller
              control={form.control}
              name='priority'
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {TASK_PRIORITY_LABEL[priority]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label={copy.formDue} optional error={errors.dueAt?.message}>
            <Input type='datetime-local' {...form.register('dueAt')} />
          </Field>
        </div>
        {canSupervise && (
          <Field label={copy.formAssignee}>
            <Controller
              control={form.control}
              name='assigneeMemberId'
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder={copy.me} />
                  </SelectTrigger>
                  <SelectContent>
                    {memberId &&
                      !members.data?.some((m) => m.id === memberId) && (
                        <SelectItem value={memberId}>{copy.me}</SelectItem>
                      )}
                    {(members.data ?? []).map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.id === memberId
                          ? `${copy.me} (${member.username})`
                          : [member.firstName, member.lastName]
                              .filter(Boolean)
                              .join(' ') || member.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        )}
      </div>
    </FormSheet>
  )
}
