import { Link } from '@tanstack/react-router'
import type { Task } from '@chat-crm/contracts'
import { MoreHorizontal, Pencil, RotateCcw, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChannelIcon } from '@/features/chats/components/channel-icon'
import { LoadError } from '@/features/workspace/components/load-error'
import {
  PRIORITY_TINT,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  copy,
} from '../copy'

const dueFormat = new Intl.DateTimeFormat('es-PE', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function Due({ task }: { task: Task }) {
  if (!task.dueAt)
    return <span className='text-muted-foreground'>{copy.noDue}</span>
  return (
    <span
      className={cn(
        'tabular-nums',
        task.overdue ? 'text-destructive font-medium' : 'text-foreground'
      )}
    >
      {dueFormat.format(task.dueAt)}
      {task.overdue && <span className='sr-only'> ({copy.overdue})</span>}
    </span>
  )
}

function Linked({ task }: { task: Task }) {
  if (task.conversation) {
    return (
      <Link
        to='/chats'
        search={{ conversation: task.conversation.id }}
        className='hover:text-foreground text-muted-foreground inline-flex max-w-48 items-center gap-1 underline-offset-2 hover:underline'
      >
        <ChannelIcon type={task.conversation.channelType} />
        <span className='truncate'>
          {task.conversation.customerName ??
            task.customer?.displayName ??
            'Chat'}
        </span>
      </Link>
    )
  }
  if (task.customer) {
    return (
      <Link
        to='/customers'
        search={{ customer: task.customer.id }}
        className='text-muted-foreground hover:text-foreground truncate underline-offset-2 hover:underline'
      >
        {task.customer.displayName ?? 'Cliente'}
      </Link>
    )
  }
  return <span className='text-muted-foreground'>—</span>
}

type RowActions = {
  onComplete: (task: Task) => void
  onEdit: (task: Task) => void
  onCancel: (task: Task) => void
  onReopen: (task: Task) => void
  busy?: boolean
}

function CompleteBox({
  task,
  onComplete,
  onReopen,
  busy,
}: { task: Task } & RowActions) {
  return (
    <Checkbox
      className='max-sm:size-5'
      checked={task.status === 'done'}
      disabled={busy || task.status === 'cancelled'}
      aria-label={
        task.status === 'done'
          ? `${copy.reopen}: ${task.title}`
          : `${copy.complete}: ${task.title}`
      }
      onCheckedChange={(checked) =>
        checked ? onComplete(task) : onReopen(task)
      }
    />
  )
}

function RowMenu({
  task,
  onEdit,
  onCancel,
  onReopen,
}: { task: Task } & RowActions) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='size-11 sm:size-8'
          aria-label={`Acciones: ${task.title}`}
        >
          <MoreHorizontal className='size-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onSelect={() => onEdit(task)}>
          <Pencil />
          {copy.edit}
        </DropdownMenuItem>
        {task.status === 'open' ? (
          <DropdownMenuItem onSelect={() => onCancel(task)}>
            <XCircle />
            {copy.cancel}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => onReopen(task)}>
            <RotateCcw />
            {copy.reopen}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Tasks as a table from `md` and as stacked rows on phones. The checkbox
 * completes (or reopens) in one tap; edit and cancel live in the row menu.
 */
export function TasksList({
  tasks,
  loading,
  error,
  onRetry,
  showAssignee = false,
  ...actions
}: {
  tasks: Task[]
  loading?: boolean
  error?: boolean
  onRetry: () => void
  showAssignee?: boolean
} & RowActions) {
  if (loading) {
    return (
      <div className='space-y-2 p-4'>
        <Skeleton className='h-10 w-full' />
        <Skeleton className='h-10 w-full' />
        <Skeleton className='h-10 w-full' />
      </div>
    )
  }
  if (error) return <LoadError title={copy.tasksError} onRetry={onRetry} />
  if (tasks.length === 0) {
    return (
      <div className='px-6 py-12 text-center'>
        <p className='text-sm font-medium'>{copy.tasksEmpty}</p>
        <p className='text-muted-foreground text-sm'>{copy.tasksEmptyHint}</p>
      </div>
    )
  }

  return (
    <>
      <Table className='max-md:hidden'>
        <TableHeader>
          <TableRow>
            <TableHead className='w-10'>
              <span className='sr-only'>{copy.complete}</span>
            </TableHead>
            <TableHead>{copy.task}</TableHead>
            <TableHead>{copy.priority}</TableHead>
            <TableHead>{copy.due}</TableHead>
            <TableHead>{copy.linked}</TableHead>
            {showAssignee && <TableHead>{copy.assignee}</TableHead>}
            <TableHead className='w-12'>
              <span className='sr-only'>Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow
              key={task.id}
              data-state={task.status !== 'open' ? 'done' : undefined}
            >
              <TableCell>
                <CompleteBox task={task} {...actions} />
              </TableCell>
              <TableCell className='max-w-80'>
                <p
                  className={cn(
                    'truncate font-medium',
                    task.status !== 'open' &&
                      'text-muted-foreground line-through'
                  )}
                >
                  {task.title}
                </p>
                {task.description && (
                  <p className='text-muted-foreground truncate text-xs'>
                    {task.description}
                  </p>
                )}
                {task.status === 'cancelled' && (
                  <Badge variant='outline' className='mt-1 h-5 text-[11px]'>
                    {TASK_STATUS_LABEL.cancelled}
                  </Badge>
                )}
              </TableCell>
              <TableCell className={PRIORITY_TINT[task.priority]}>
                {TASK_PRIORITY_LABEL[task.priority]}
              </TableCell>
              <TableCell>
                <Due task={task} />
              </TableCell>
              <TableCell>
                <Linked task={task} />
              </TableCell>
              {showAssignee && <TableCell>{task.assignee.name}</TableCell>}
              <TableCell>
                <RowMenu task={task} {...actions} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ul className='divide-y md:hidden'>
        {tasks.map((task) => (
          <li key={task.id} className='flex items-start gap-3 px-4 py-3'>
            <span className='pt-3'>
              <CompleteBox task={task} {...actions} />
            </span>
            <div className='min-w-0 flex-1 space-y-1 pt-2'>
              <p
                className={cn(
                  'text-sm font-medium',
                  task.status !== 'open' && 'text-muted-foreground line-through'
                )}
              >
                {task.title}
              </p>
              <p className='flex flex-wrap items-center gap-x-2 gap-y-1 text-xs'>
                <span className={PRIORITY_TINT[task.priority]}>
                  {TASK_PRIORITY_LABEL[task.priority]}
                </span>
                <Due task={task} />
                <Linked task={task} />
                {showAssignee && (
                  <span className='text-muted-foreground'>
                    {task.assignee.name}
                  </span>
                )}
              </p>
            </div>
            <RowMenu task={task} {...actions} />
          </li>
        ))}
      </ul>
    </>
  )
}
