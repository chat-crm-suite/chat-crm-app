import type {
  MemberRole,
  MemberStatus,
  PresenceState,
} from '@chat-crm/contracts'
import { plural } from '../workspace/form-utils'
import type { TeamDenial } from './team-policy'

/** User-facing Spanish copy of Equipo (code stays in English). */

export const ROLE_LABEL: Record<MemberRole, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  agent: 'Agente',
}

export const ROLE_LABEL_PLURAL: Record<MemberRole, string> = {
  admin: 'Administradores',
  supervisor: 'Supervisores',
  agent: 'Agentes',
}

export const ROLE_HELP: Record<MemberRole, string> = {
  admin: 'Gestiona el equipo, los ajustes de la empresa y todas las conversaciones.',
  supervisor: 'Ve el piso en vivo y reasigna conversaciones; gestiona agentes.',
  agent: 'Atiende las conversaciones que le asignen.',
}

export const STATUS_LABEL: Record<MemberStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  suspended: 'Suspendido',
}

export const PRESENCE_LABEL: Record<PresenceState, string> = {
  available: 'Disponible',
  away: 'Ausente',
  offline: 'Sin conexión',
}

export const PRESENCE_LABEL_PLURAL: Record<PresenceState, string> = {
  available: 'Disponibles',
  away: 'Ausentes',
  offline: 'Sin conexión',
}

export const DENIAL_REASON: Record<TeamDenial, string> = {
  self: 'No puedes hacer esto con tu propia cuenta. Usa tu perfil.',
  role: 'Solo un administrador puede gestionar a este miembro.',
  grant: 'Tu rol solo puede asignar el rol de agente.',
  last_admin: 'Es el único administrador. Nombra a otro antes de continuar.',
}

/** 409/403 `code` of the API -> what to fix. */
export const API_ERROR_COPY: Record<string, string> = {
  member_exists: 'Esa persona ya es parte del equipo.',
  username_taken: 'Ese nombre de usuario ya está en uso. Elige otro.',
  phone_taken: 'Ese teléfono ya pertenece a otra cuenta. Usa otro número.',
  shared_account:
    'La cuenta también está en otra empresa: solo su dueño puede cambiar nombre y teléfono.',
  account_disabled:
    'La cuenta con ese correo está desactivada. Pide a la plataforma que la reactive.',
  last_admin: 'No puedes dejar la empresa sin administradores. Nombra a otro antes.',
  team_self: DENIAL_REASON.self,
  team_role: DENIAL_REASON.role,
  team_grant: DENIAL_REASON.grant,
}

/** Which form field an API error code belongs to (shown inline there). */
export const API_ERROR_FIELD: Record<
  string,
  'email' | 'username' | 'phoneNumber'
> = {
  member_exists: 'email',
  account_disabled: 'email',
  username_taken: 'username',
  phone_taken: 'phoneNumber',
}

export const copy = {
  title: 'Equipo',
  purpose:
    'Quién atiende a tus clientes, con qué carga y si está conectado ahora.',
  add: 'Agregar miembro',
  searchPlaceholder: 'Buscar miembro',
  count: (total: number) => plural(total, 'miembro', 'miembros'),
  you: 'Tú',
  all: 'Todos',
  filters: { role: 'Rol', status: 'Estado', presence: 'Presencia' },
  columns: {
    person: 'Miembro',
    role: 'Rol',
    status: 'Estado',
    presence: 'Presencia',
    load: 'Carga',
    autoAssign: 'Asignación automática',
    lastLogin: 'Último acceso',
  },
  autoAssignLabel: (name: string) => `Asignación automática de ${name}`,
  autoAssignFailed: (name: string) =>
    `No se pudo cambiar la asignación automática de ${name}`,
  loadLabel: (open: number, capacity: number | null) =>
    capacity
      ? `${plural(open, 'conversación abierta', 'conversaciones abiertas')} de ${capacity}`
      : `${plural(open, 'conversación abierta', 'conversaciones abiertas')}, sin límite`,
  actionsLabel: (name: string) => `Acciones de ${name}`,
  menu: {
    edit: 'Editar',
    resetPassword: 'Restablecer contraseña',
    suspend: 'Suspender',
    activate: 'Activar',
    remove: 'Eliminar',
  },
  empty: {
    title: 'Aún no hay nadie en el equipo',
    description:
      'Agrega a quien va a atender las conversaciones y elige qué puede hacer.',
  },
  loadError: 'No pudimos cargar el equipo',
  form: {
    createTitle: 'Agregar miembro',
    createDescription:
      'Si el correo ya tiene cuenta, se vincula a tu empresa. Si no, creamos la cuenta con una contraseña temporal.',
    editTitle: 'Editar miembro',
    createSubmit: 'Agregar miembro',
    editSubmit: 'Guardar cambios',
    account: 'Cuenta',
    person: 'Persona',
    work: 'Trabajo',
    email: 'Correo',
    username: 'Usuario',
    usernameHint: (derived: string | null) =>
      derived
        ? `Si lo dejas vacío usaremos «${derived}».`
        : 'Si lo dejas vacío lo generamos desde el correo.',
    firstName: 'Nombre',
    lastName: 'Apellido',
    phone: 'Teléfono',
    role: 'Rol',
    capacity: 'Conversaciones abiertas a la vez',
    capacityHint: 'Vacío usa el límite de la empresa.',
    capacityPlaceholder: 'Límite de la empresa',
    autoAssign: 'Recibe conversaciones automáticamente',
    autoAssignHint: 'Si lo apagas, solo atiende lo que le asignen a mano.',
    savedToast: 'Cambios guardados',
    sharedAccountNote:
      'Esta cuenta está en más de una empresa: nombre y teléfono solo los puede cambiar su dueño.',
  },
  result: {
    createdTitle: 'Miembro agregado',
    createdSecretTitle: (name: string) => `Contraseña de ${name}`,
    createdSecretHint: (name: string) =>
      `Compártela con ${name} por un canal privado: es la única vez que se muestra.`,
    linkedTitle: 'Cuenta existente vinculada',
    linkedBody: (name: string, role: string) =>
      `${name} ya tenía cuenta y ahora es ${role.toLowerCase()} de tu empresa. Entra con su contraseña de siempre: no generamos ninguna nueva.`,
    restoredTitle: 'Miembro restaurado',
    restoredBody: (name: string, role: string) =>
      `${name} volvió al equipo como ${role.toLowerCase()}. Su cuenta y su contraseña siguen igual.`,
    done: 'Listo',
  },
  reset: {
    title: (name: string) => `¿Restablecer la contraseña de ${name}?`,
    description:
      'Generamos una contraseña nueva y cerramos sus sesiones abiertas. La anterior deja de servir.',
    confirm: 'Restablecer contraseña',
    cancel: 'Cancelar',
    resultTitle: (name: string) => `Nueva contraseña de ${name}`,
    resultHint: (name: string) =>
      `Compártela con ${name} por un canal privado: es la única vez que se muestra.`,
  },
  remove: {
    title: (name: string) => `¿Eliminar a ${name}?`,
    openConversations: (count: number) =>
      count === 0
        ? 'No tiene conversaciones abiertas.'
        : count === 1
          ? 'Su 1 conversación abierta volverá a la cola sin asignar.'
          : `Sus ${count} conversaciones abiertas volverán a la cola sin asignar.`,
    consequences:
      'Pierde el acceso y se cierran sus sesiones. Podrás volver a agregarlo después.',
    typeToConfirm: (username: string) => `Escribe ${username} para confirmar`,
    confirm: 'Eliminar miembro',
    cancel: 'Cancelar',
    done: (name: string, released: number) =>
      released === 0
        ? `${name} eliminado del equipo`
        : `${name} eliminado. ${plural(released, 'conversación volvió', 'conversaciones volvieron')} a la cola.`,
  },
  statusChanged: (name: string, status: MemberStatus) =>
    status === 'active' ? `${name} activado` : `${name} suspendido`,
  genericError: 'No se pudo completar la acción. Inténtalo de nuevo.',
}
