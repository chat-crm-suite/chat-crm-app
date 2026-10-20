import type {
  TaskPriority,
  TaskStatus,
  WorkSignalKind,
} from '@chat-crm/contracts'

/** User-facing Spanish copy of Mi trabajo (code stays in English). */

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  open: 'Abierta',
  done: 'Completada',
  cancelled: 'Cancelada',
}

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
}

export const SIGNAL_LABEL: Record<WorkSignalKind, string> = {
  unassigned: 'Sin asignar',
  needs_response: 'Falta responder',
  window_expiring: 'Ventana por vencer',
}

export const SIGNAL_HINT: Record<WorkSignalKind, string> = {
  unassigned: 'Chats en la cola esperando a alguien',
  needs_response: 'El cliente escribió y espera respuesta',
  window_expiring: 'La ventana de respuesta cierra pronto',
}

export const copy = {
  title: 'Mi trabajo',
  description: 'Tus avisos y tareas pendientes en un solo lugar.',
  tabMine: 'Mi trabajo',
  tabTeam: 'Equipo',
  teamDescription: 'Avisos y tareas de todo el equipo.',
  allAgents: 'Todos los agentes',
  agentFilter: 'Filtrar por agente',
  signalsTitle: 'Avisos',
  signalsEmpty: 'Todo al día: no hay chats esperando.',
  signalsError: 'No se pudieron cargar los avisos.',
  tasksTitle: 'Tareas',
  tasksEmpty: 'No hay tareas aquí.',
  tasksEmptyHint: 'Crea una tarea para no perder un seguimiento.',
  tasksError: 'No se pudieron cargar las tareas.',
  filterOpen: 'Abiertas',
  filterDone: 'Completadas',
  filterAll: 'Todas',
  newTask: 'Nueva tarea',
  editTask: 'Editar tarea',
  openChat: 'Abrir chat',
  take: 'Tomar',
  complete: 'Completar',
  completed: 'Tarea completada',
  reopen: 'Reabrir',
  cancel: 'Cancelar tarea',
  cancelled: 'Tarea cancelada',
  edit: 'Editar',
  overdue: 'Vencida',
  noDue: 'Sin fecha',
  assignee: 'Responsable',
  linked: 'Vínculo',
  due: 'Vence',
  priority: 'Prioridad',
  status: 'Estado',
  task: 'Tarea',
  me: 'Yo',
  saveError: 'No se pudo guardar la tarea. Inténtalo de nuevo.',
  created: 'Tarea creada',
  saved: 'Tarea actualizada',
  takeError: 'No se pudo tomar el chat',
  taken: 'Chat asignado a tu nombre',

  // Form
  formTitle: 'Título',
  formTitlePlaceholder: 'Qué hay que hacer',
  formDescription: 'Descripción',
  formDue: 'Fecha límite',
  formPriority: 'Prioridad',
  formAssignee: 'Asignar a',
  formLinkedChat: (name: string) => `Vinculada al chat con ${name}`,
  create: 'Crear tarea',
  save: 'Guardar',
} as const

/** Badge tint per priority (theme tokens only). */
export const PRIORITY_TINT: Record<TaskPriority, string> = {
  low: 'text-muted-foreground',
  medium: 'text-foreground',
  high: 'text-foreground font-semibold',
  urgent: 'text-destructive font-semibold',
}
