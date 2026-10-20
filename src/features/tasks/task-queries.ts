import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  completeTask,
  createTask,
  getWorkQueue,
  listTasks,
  updateTask,
} from '@/services/task.service'
import type {
  CreateTaskInput,
  ListScope,
  ListTasksQuery,
  Task,
  UpdateTaskInput,
  WorkQueueCounts,
} from '@chat-crm/contracts'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { copy } from './copy'

export const taskKeys = {
  all: ['tasks'] as const,
  list: (query: Partial<ListTasksQuery>) => ['tasks', 'list', query] as const,
}

export const workQueueKeys = {
  all: ['work-queue'] as const,
  scope: (scope: ListScope, assigneeId?: string) =>
    ['work-queue', scope, assigneeId ?? null] as const,
}

/** Tasks + work queue go stale together: any task write touches both. */
export function invalidateWork(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: taskKeys.all })
  void queryClient.invalidateQueries({ queryKey: workQueueKeys.all })
}

export function useTasks(query: Partial<ListTasksQuery>, enabled = true) {
  return useQuery({
    queryKey: taskKeys.list(query),
    queryFn: () => listTasks(query),
    enabled,
    placeholderData: (previous) => previous,
  })
}

export function useWorkQueue(
  scope: ListScope,
  assigneeId?: string,
  enabled = true
) {
  return useQuery({
    queryKey: workQueueKeys.scope(scope, assigneeId),
    queryFn: () =>
      getWorkQueue({ scope, ...(assigneeId ? { assigneeId } : {}) }),
    enabled,
    placeholderData: (previous) => previous,
    staleTime: 15_000,
  })
}

/** Sidebar badge: what is waiting on me (open tasks + live alerts). */
export function workBadgeCount(counts: WorkQueueCounts | undefined): number {
  if (!counts) return 0
  return (
    counts.tasksOpen +
    counts.unassigned +
    counts.needsResponse +
    counts.windowExpiring
  )
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(input),
    onSuccess: () => {
      toast.success(copy.created)
      invalidateWork(queryClient)
    },
    onError: (error) => toast.error(getApiErrorMessage(error, copy.saveError)),
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      updateTask(id, input),
    onSuccess: (task) => {
      toast.success(task.status === 'cancelled' ? copy.cancelled : copy.saved)
      invalidateWork(queryClient)
    },
    onError: (error) => toast.error(getApiErrorMessage(error, copy.saveError)),
  })
}

export function useCompleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (task: Pick<Task, 'id'>) => completeTask(task.id),
    onSuccess: () => {
      toast.success(copy.completed)
      invalidateWork(queryClient)
    },
    onError: (error) => toast.error(getApiErrorMessage(error, copy.saveError)),
  })
}
