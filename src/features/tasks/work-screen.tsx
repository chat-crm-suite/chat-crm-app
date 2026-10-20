import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchCompanyMembers } from '@/services/chat.service'
import type { Task } from '@chat-crm/contracts'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMemberRole } from '@/hooks/use-member-role'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { memberDisplayName } from '@/features/chats/hooks/use-conversation-lifecycle'
import { SignalsPanel } from './components/signals-panel'
import { TaskDialog } from './components/task-dialog'
import { TasksList } from './components/tasks-list'
import { copy } from './copy'
import type { WorkSearch } from './search'
import {
  useCompleteTask,
  useTasks,
  useUpdateTask,
  useWorkQueue,
} from './task-queries'

const ALL = '__all'

const STATUS_FILTERS = [
  { id: 'open', label: copy.filterOpen },
  { id: 'done', label: copy.filterDone },
  { id: 'all', label: copy.filterAll },
] as const

type Props = {
  search: WorkSearch
  onSearchChange: (patch: Partial<WorkSearch>) => void
}

/**
 * Body of Mi trabajo: Avisos (live signals) on top, Tareas below. Admins and
 * supervisors get an "Equipo" tab (`scope=all`) with an agent filter. It
 * knows nothing about the router, so it renders the same in tests.
 */
export function WorkScreen({ search, onSearchChange }: Props) {
  const { canSupervise } = useMemberRole()
  const team = canSupervise && search.tab === 'team'
  const scope = team ? 'all' : 'mine'
  const assigneeId = team ? search.assignee : undefined
  const status = search.status ?? 'open'

  const [editing, setEditing] = useState<Task | null>(null)
  const [creating, setCreating] = useState(false)

  const queue = useWorkQueue(scope, assigneeId)
  const tasks = useTasks({
    scope,
    ...(assigneeId ? { assigneeId } : {}),
    ...(status !== 'all' ? { status } : {}),
  })
  const members = useQuery({
    queryKey: ['company-members', 'all'],
    queryFn: () => searchCompanyMembers(''),
    enabled: team,
    staleTime: 60_000,
  })

  const complete = useCompleteTask()
  const update = useUpdateTask()

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-bold tracking-tight'>{copy.title}</h1>
          <p className='text-muted-foreground text-sm'>
            {team ? copy.teamDescription : copy.description}
          </p>
        </div>
        <Button className='h-11 sm:h-9' onClick={() => setCreating(true)}>
          <Plus className='size-4' />
          {copy.newTask}
        </Button>
      </div>

      {canSupervise && (
        <div className='flex flex-wrap items-center gap-3'>
          <Tabs
            value={team ? 'team' : 'mine'}
            onValueChange={(value) =>
              onSearchChange({
                tab: value === 'team' ? 'team' : undefined,
                assignee: undefined,
              })
            }
          >
            <TabsList>
              <TabsTrigger value='mine'>{copy.tabMine}</TabsTrigger>
              <TabsTrigger value='team'>{copy.tabTeam}</TabsTrigger>
            </TabsList>
          </Tabs>
          {team && (
            <Select
              value={search.assignee ?? ALL}
              onValueChange={(value) =>
                onSearchChange({ assignee: value === ALL ? undefined : value })
              }
            >
              <SelectTrigger
                className='h-11 w-56 sm:h-9'
                aria-label={copy.agentFilter}
              >
                <SelectValue placeholder={copy.allAgents} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{copy.allAgents}</SelectItem>
                {(members.data ?? []).map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {memberDisplayName(member)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      <SignalsPanel
        signals={queue.data?.signals ?? []}
        counts={queue.data?.counts}
        loading={queue.isPending}
        error={queue.isError}
        onRetry={() => void queue.refetch()}
        showAssignee={team}
      />

      <section
        aria-labelledby='tasks-title'
        className='bg-card rounded-lg border'
      >
        <header className='flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3'>
          <h2 id='tasks-title' className='text-sm font-semibold'>
            {copy.tasksTitle}
            {queue.data && queue.data.counts.tasksOverdue > 0 && (
              <span className='text-destructive ms-2 text-xs font-medium'>
                {queue.data.counts.tasksOverdue} {copy.overdue.toLowerCase()}
                {queue.data.counts.tasksOverdue === 1 ? '' : 's'}
              </span>
            )}
          </h2>
          <div
            role='group'
            aria-label={copy.status}
            className='bg-muted/60 flex gap-0.5 rounded-lg p-0.5'
          >
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type='button'
                aria-pressed={status === filter.id}
                onClick={() =>
                  onSearchChange({
                    status: filter.id === 'open' ? undefined : filter.id,
                  })
                }
                className={cn(
                  'h-9 rounded-md px-3 text-xs font-medium sm:h-7',
                  'focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]',
                  status === filter.id
                    ? 'bg-card shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </header>
        <TasksList
          tasks={tasks.data ?? []}
          loading={tasks.isPending}
          error={tasks.isError}
          onRetry={() => void tasks.refetch()}
          showAssignee={team}
          busy={complete.isPending || update.isPending}
          onComplete={(task) => complete.mutate(task)}
          onReopen={(task) =>
            update.mutate({ id: task.id, input: { status: 'open' } })
          }
          onCancel={(task) =>
            update.mutate({ id: task.id, input: { status: 'cancelled' } })
          }
          onEdit={setEditing}
        />
      </section>

      <TaskDialog
        open={creating || !!editing}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false)
            setEditing(null)
          }
        }}
        task={editing}
      />
    </div>
  )
}
