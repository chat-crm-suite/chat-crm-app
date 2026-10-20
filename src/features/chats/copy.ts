import type {
  ChannelType,
  ConversationErrorCode,
  ConversationPriority,
  ConversationStatus,
  PresenceState,
} from '@chat-crm/contracts'

/** User-facing Spanish copy of the inbox (code stays in English). */

export const STATUS_LABEL: Record<ConversationStatus, string> = {
  open: 'Abierto',
  pending: 'En espera',
  closed: 'Resuelto',
  archived: 'Archivado',
}

export const PRIORITY_LABEL: Record<ConversationPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
}

export const CHANNEL_LABEL: Record<ChannelType, string> = {
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  messenger: 'Messenger',
  instagram: 'Instagram',
  email: 'Correo',
  sms: 'SMS',
  webchat: 'Webchat',
}

export const PRESENCE_LABEL: Record<PresenceState, string> = {
  available: 'Disponible',
  away: 'Ausente',
  offline: 'Sin conexión',
}

/** `code` of a 4xx from the conversation endpoints -> what to do. */
export const CONVERSATION_ERROR_COPY: Record<ConversationErrorCode, string> = {
  reply_window_closed:
    'La ventana de respuesta está cerrada: envía una plantilla aprobada.',
  templates_unsupported: 'Este canal no admite plantillas.',
  template_unavailable:
    'La plantilla ya no está disponible (no aprobada, oculta o de otro canal).',
  template_params_missing: 'Completa todas las variables de la plantilla.',
}

export const LIST_VIEW_LABEL = {
  mine: 'Mis chats',
  queue: 'Cola',
  needs: 'Sin resp.',
  all: 'Todos',
} as const

export const LIST_VIEW_TITLE = {
  mine: 'Mis chats',
  queue: 'Sin asignar',
  needs: 'Sin respuesta',
  all: 'Todos los chats',
} as const

export const copy = {
  customerFallback: 'Cliente',
  unknownCustomer: 'Desconocido',
  newChat: 'Nuevo chat',
  searchConversation: 'Buscar conversación…',
  offline: 'Sin conexión',
  offlineHint: 'Sin conexión: los mensajes nuevos pueden demorar',
  transferred: 'Transferido',
  unassigned: 'Sin asignar',
  you: 'Tú',
  emptyTitle: 'Tus mensajes',
  emptyBody: 'Selecciona una conversación o inicia una nueva.',
  emptyAction: 'Nuevo chat',

  // Assignee picker
  take: 'Tomar',
  taking: 'Tomando…',
  release: 'Liberar a la cola',
  assign: 'Asignar',
  transfer: 'Transferir',
  transferWithNote: 'Transferir con nota',
  assignTo: (name: string) => `Asignar a ${name}`,
  transferTo: (name: string) => `Transferir a ${name}`,
  searchMembers: 'Buscar miembros…',
  noMembers: 'Ningún miembro coincide.',
  membersError: 'No se pudo cargar el equipo.',
  noteLabel: 'Nota interna (opcional)',
  transferNotePlaceholder: 'Contexto para quien recibe el chat',
  workload: (open: number, max?: number | null) =>
    max ? `${open}/${max} chats` : `${open} chats`,
  assignedToast: 'Chat asignado',
  assignedSelfToast: 'Chat asignado a tu nombre',
  transferredToast: (name: string) => `Chat transferido a ${name}`,
  releasedToast: 'Chat devuelto a la cola',
  assignError: 'No se pudo asignar el chat',
  takeError: 'No se pudo tomar el chat',

  // Lifecycle
  resolve: 'Resolver',
  resolving: 'Resolviendo…',
  resolveWithNote: 'Resolver con nota…',
  resolveTitle: '¿Resolver esta conversación?',
  resolveDescription:
    'Se cierra el caso y el chat vuelve a la cola. Si el cliente escribe de nuevo, se reabre solo.',
  resolveNotePlaceholder: 'Qué se resolvió',
  setPending: 'Poner en espera',
  resume: 'Quitar la espera',
  reopen: 'Reabrir',
  reopening: 'Reabriendo…',
  resolvedToast: 'Conversación resuelta',
  pendingToast: 'Conversación en espera',
  reopenedToast: 'Conversación reabierta',
  lifecycleError: 'No se pudo actualizar la conversación. Inténtalo de nuevo.',
  moreActions: 'Más acciones',
  createTask: 'Crear tarea',
  priority: 'Prioridad',
  priorityNone: 'Sin prioridad',
  priorityToast: 'Prioridad actualizada',
  assignmentHistory: 'Historial de asignaciones',
  viewContact: 'Ver contacto',
  caseDetail: 'Detalle del caso',
  backToList: 'Volver a la lista',

  // History dialog
  historyEmpty: 'Esta conversación aún no tuvo responsables.',
  historyError: 'No se pudo cargar el historial.',
  historyActive: 'Actual',

  // Rail
  railTitle: 'Detalle',
  sectionContact: 'Contacto',
  sectionWindow: 'Ventana',
  sectionCase: 'Caso',
  sectionTasks: 'Tareas del chat',
  sectionSentiment: 'Sentimiento',
  rowStatus: 'Estado',
  rowOwner: 'Responsable',
  rowPriority: 'Prioridad',
  rowChannel: 'Canal',
  rowTransfer: 'Transferido por',
  ownerMe: 'Asignado a ti',
  takeChat: 'Tomar chat',
  windowNone: 'El cliente aún no ha escrito',
  windowNoLimit: 'Este canal no tiene ventana de respuesta',
  windowExpired: 'Ventana vencida · usa una plantilla',
  windowLabel: (hours: number) => `Ventana de ${hours} h`,
  useTemplate: 'Enviar plantilla',
  tasksEmpty: 'Sin tareas para este chat.',
  tasksError: 'No se pudieron cargar las tareas.',
  newTask: 'Nueva tarea',
  viewProfile: 'Ver ficha',

  // Composer
  slashHint: 'Escribe / para respuestas rápidas',
  quickReplies: 'Respuestas rápidas',
  noQuickReplies: 'Ninguna respuesta coincide',
  template: 'Plantilla',
  windowClosedTitle: (hours: number) => `Ventana de ${hours} h cerrada`,
  windowClosedBody:
    'Pasó la ventana de respuesta desde el último mensaje del cliente. Envía una plantilla aprobada para reabrir la conversación.',
  neverWroteTitle: 'El cliente aún no ha escrito',
  neverWroteBody:
    'Este canal solo permite iniciar la conversación con una plantilla aprobada.',
  pickTemplate: 'Elegir plantilla',
  resolvedTitle: 'Conversación resuelta',
  resolvedBody: 'Puedes seguir respondiendo o reabrirla.',
} as const

/** "hace 5 min" style helpers live in `lib/list-time.ts`. */
export const QUICK_REPLIES = [
  {
    label: 'Saludo',
    draft: '¡Hola! Gracias por escribirnos. ¿En qué puedo ayudarte?',
  },
  {
    label: 'Cotización',
    draft:
      'Te comparto la cotización solicitada. Quedo atento a cualquier consulta.',
  },
  {
    label: 'Comprobante',
    draft: '¿Podrías enviarnos el comprobante de pago, por favor?',
  },
  {
    label: 'Seguimiento',
    draft: '¿Pudiste revisar la información que te enviamos?',
  },
  {
    label: 'Despedida',
    draft: 'Gracias por contactarnos. ¡Que tengas un excelente día!',
  },
] as const
