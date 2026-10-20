import {
  TaskSchema,
  WorkQueueResponseSchema,
  type CreateTaskInput,
  type ListTasksQuery,
  type Task,
  type UpdateTaskInput,
  type WorkQueueQuery,
  type WorkQueueResponse,
} from '@chat-crm/contracts'
import { parseContract } from '@/lib/contract-parse'
import { withDevFixture } from '@/lib/dev-fixtures'
import { client } from '@/lib/http'

const tasks = client('/tasks')
const workQueue = client('/work-queue')

const fixtures = () => import('@/features/tasks/__fixtures__/work-queue')

/** `GET /tasks`: open first, then by due date. `scope=all` = supervision. */
export const listTasks = (
  query: Partial<ListTasksQuery> = {}
): Promise<Task[]> =>
  withDevFixture(
    async () =>
      (await fixtures()).FIXTURE_TASKS.filter(
        (task) =>
          (!query.status || task.status === query.status) &&
          (!query.conversationId ||
            task.conversation?.id === query.conversationId) &&
          (!query.assigneeId || task.assignee.memberId === query.assigneeId) &&
          (query.scope === 'all' || task.assignee.memberId === 'm-ana')
      ),
    async () => {
      const { data } = await tasks.get('', { params: query })
      return parseContract(TaskSchema.array(), data ?? [])
    }
  )

export const createTask = async (input: CreateTaskInput): Promise<Task> => {
  const { data } = await tasks.post('', input)
  return parseContract(TaskSchema, data)
}

export const updateTask = async (
  id: string,
  input: UpdateTaskInput
): Promise<Task> => {
  const { data } = await tasks.patch(`/${id}`, input)
  return parseContract(TaskSchema, data)
}

export const completeTask = async (id: string): Promise<Task> => {
  const { data } = await tasks.post(`/${id}/complete`)
  return parseContract(TaskSchema, data)
}

/** Own tasks + derived signals + counts (never 404, zeros when empty). */
export const getWorkQueue = (
  query: Partial<WorkQueueQuery> = {}
): Promise<WorkQueueResponse> =>
  withDevFixture(
    async () => (await fixtures()).FIXTURE_WORK_QUEUE,
    async () => {
      const { data } = await workQueue.get('', { params: query })
      return parseContract(WorkQueueResponseSchema, data)
    }
  )
