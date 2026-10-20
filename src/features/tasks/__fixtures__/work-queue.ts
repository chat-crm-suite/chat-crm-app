import { TaskSchema, WorkQueueResponseSchema } from '@chat-crm/contracts'

/**
 * Contract fixtures of tasks and the work queue. Parsed through the schemas so
 * a contract change breaks them loudly; used by specs and by the explicit dev
 * switch (`lib/dev-fixtures.ts`), never as a production fallback.
 */

const HOUR = 60 * 60 * 1000
const now = Date.now()
const at = (hoursFromNow: number) => new Date(now + hoursFromNow * HOUR)

const ana = { memberId: 'm-ana', name: 'Ana Torres' }
const luis = { memberId: 'm-luis', name: 'Luis Quispe' }

export const FIXTURE_TASKS = TaskSchema.array().parse([
  {
    id: 'task-1',
    title: 'Enviar factura con RUC a Rosa',
    description: 'Pidió la factura a nombre de su empresa.',
    status: 'open',
    priority: 'high',
    dueAt: at(3),
    overdue: false,
    assignee: ana,
    createdBy: luis,
    conversation: {
      id: 'conv-rosa',
      channelType: 'whatsapp',
      customerName: 'Rosa Medina',
    },
    customer: { id: 'cus-rosa', displayName: 'Rosa Medina' },
    completedAt: null,
    createdAt: at(-5),
    updatedAt: at(-5),
  },
  {
    id: 'task-2',
    title: 'Llamar a Jorge por el reclamo',
    description: null,
    status: 'open',
    priority: 'urgent',
    dueAt: at(-2),
    overdue: true,
    assignee: ana,
    createdBy: ana,
    conversation: {
      id: 'conv-jorge',
      channelType: 'whatsapp',
      customerName: 'Jorge Salas',
    },
    customer: { id: 'cus-jorge', displayName: 'Jorge Salas' },
    completedAt: null,
    createdAt: at(-30),
    updatedAt: at(-30),
  },
  {
    id: 'task-3',
    title: 'Actualizar lista de precios',
    description: null,
    status: 'open',
    priority: 'low',
    dueAt: null,
    overdue: false,
    assignee: luis,
    createdBy: ana,
    conversation: null,
    customer: null,
    completedAt: null,
    createdAt: at(-48),
    updatedAt: at(-48),
  },
  {
    id: 'task-4',
    title: 'Confirmar entrega a Marta',
    description: null,
    status: 'done',
    priority: 'medium',
    dueAt: at(-20),
    overdue: false,
    assignee: ana,
    createdBy: ana,
    conversation: {
      id: 'conv-marta',
      channelType: 'whatsapp',
      customerName: 'Marta Ríos',
    },
    customer: { id: 'cus-marta', displayName: 'Marta Ríos' },
    completedAt: at(-19),
    createdAt: at(-26),
    updatedAt: at(-19),
  },
])

export const FIXTURE_WORK_QUEUE = WorkQueueResponseSchema.parse({
  tasks: FIXTURE_TASKS.filter((task) => task.status === 'open'),
  signals: [
    {
      kind: 'unassigned',
      conversationId: 'conv-pedro',
      customer: { id: 'cus-pedro', displayName: null, phone: '+51933344455' },
      channelType: 'whatsapp',
      since: at(-0.7),
      windowExpiresAt: at(23.3),
      assignee: null,
    },
    {
      kind: 'needs_response',
      conversationId: 'conv-rosa',
      customer: {
        id: 'cus-rosa',
        displayName: 'Rosa Medina',
        phone: '+51987654321',
      },
      channelType: 'whatsapp',
      since: at(-0.4),
      windowExpiresAt: at(23.8),
      assignee: ana,
    },
    {
      kind: 'window_expiring',
      conversationId: 'conv-jorge',
      customer: {
        id: 'cus-jorge',
        displayName: 'Jorge Salas',
        phone: '+51912345678',
      },
      channelType: 'whatsapp',
      since: at(-22.5),
      windowExpiresAt: at(1.5),
      assignee: ana,
    },
  ],
  counts: {
    tasksOpen: 3,
    tasksOverdue: 1,
    unassigned: 1,
    needsResponse: 1,
    windowExpiring: 1,
  },
  generatedAt: new Date(now),
})

/** Empty company: every list empty and every count zero. */
export const FIXTURE_EMPTY_WORK_QUEUE = WorkQueueResponseSchema.parse({
  tasks: [],
  signals: [],
  counts: {
    tasksOpen: 0,
    tasksOverdue: 0,
    unassigned: 0,
    needsResponse: 0,
    windowExpiring: 0,
  },
  generatedAt: new Date(now),
})
