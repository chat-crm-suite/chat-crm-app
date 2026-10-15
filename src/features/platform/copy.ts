import type { CompanyStatus, MemberCreateOutcome } from '@chat-crm/contracts'

/** User-facing Spanish copy for the platform console. */

export const PLATFORM_COPY = {
  consoleName: 'Consola de plataforma',
  backToApp: 'Volver a la app',
  lock: 'Bloquear',
  locked: 'Consola bloqueada',
  lockFailed: 'No se pudo bloquear la consola. Inténtalo de nuevo.',
  relocked:
    'La consola se bloqueó por inactividad. Vuelve a ingresar la contraseña.',
} as const

export const UNLOCK_COPY = {
  title: 'Desbloquea la consola',
  description:
    'Desde aquí se administran todas las empresas de la instalación. Ingresa la contraseña de la consola para continuar; la sesión dura 30 minutos.',
  password: 'Contraseña de la consola',
  submit: 'Desbloquear',
  wrongPassword:
    'La contraseña no es correcta. Revísala e inténtalo de nuevo.',
  forbidden: 'Tu cuenta no tiene permiso para abrir la consola.',
  failed: 'No se pudo desbloquear la consola. Inténtalo de nuevo.',
  disabledTitle: 'La consola está desactivada',
  disabledDescription:
    'Para activarla, quien administra el servidor debe definir PLATFORM_CONSOLE_PASSWORD en la configuración de la API y reiniciarla.',
} as const

/** "Puedes volver a intentarlo en 4:32." */
export function rateLimitMessage(clock: string): string {
  return `Demasiados intentos. Puedes volver a intentarlo en ${clock}.`
}

export const COMPANIES_COPY = {
  title: 'Empresas',
  description: 'Todas las empresas de esta instalación y quién trabaja en ellas.',
  create: 'Nueva empresa',
  searchPlaceholder: 'Buscar por nombre o correo',
  statusFilter: 'Estado',
  showDeleted: 'Mostrar eliminadas',
  summary: (total: number) =>
    total === 1 ? '1 empresa' : `${total} empresas`,
  columns: {
    company: 'Empresa',
    status: 'Estado',
    members: 'Miembros',
    customers: 'Clientes',
    channels: 'Canales',
    created: 'Creada',
  },
  deletedBadge: 'Eliminada',
  edit: 'Editar',
  remove: 'Eliminar',
  restore: 'Restaurar',
  emptyTitle: 'Aún no hay empresas',
  emptyDescription:
    'Crea la primera empresa y, si quieres, su primer administrador para que pueda entrar.',
  loadFailed: 'No se pudieron cargar las empresas.',
  retry: 'Reintentar',
} as const

export const STATUS_LABELS: Record<CompanyStatus, string> = {
  active: 'Activa',
  inactive: 'Inactiva',
  suspended: 'Suspendida',
}

export const CREATE_COPY = {
  title: 'Nueva empresa',
  description:
    'Los datos básicos de la empresa. El primer administrador es opcional.',
  submit: 'Crear empresa',
  resultTitle: 'Empresa creada',
  companySection: 'Datos de la empresa',
  name: 'Nombre',
  email: 'Correo de contacto',
  phone: 'Teléfono',
  address: 'Dirección',
  timezone: 'Zona horaria',
  adminSection: 'Primer administrador',
  adminDescription:
    'Si el correo ya tiene cuenta, la vinculamos a esta empresa. Si no, creamos la cuenta con una contraseña temporal.',
  adminEmail: 'Correo del administrador',
  adminFirstName: 'Nombre',
  adminLastName: 'Apellidos',
  failed: 'No se pudo crear la empresa. Revisa los campos marcados.',
  created: (name: string) => `Empresa «${name}» creada`,
  done: 'Listo',
  noAdmin:
    'La empresa quedó sin administrador. Nadie podrá entrar a ella hasta que agregues uno.',
  passwordTitle: (who: string) => `Contraseña de ${who}`,
  passwordDescription: (company: string) =>
    `Entrégasela a quien administrará ${company}. Podrá cambiarla desde Ajustes al entrar.`,
} as const

export function outcomeText(
  outcome: MemberCreateOutcome,
  email: string,
  company: string
): string {
  switch (outcome) {
    case 'linked':
      return `${email} ya tenía una cuenta. La vinculamos como administrador de ${company}; entra con su contraseña de siempre.`
    case 'restored':
      return `${email} ya había trabajado en ${company}. Restauramos su acceso como administrador.`
    case 'created':
      return `Creamos la cuenta de ${email} como administrador de ${company}.`
  }
}

export const EDIT_COPY = {
  title: 'Editar empresa',
  submit: 'Guardar cambios',
  saved: 'Cambios guardados',
  status: 'Estado',
  statusHint: {
    active: 'La empresa funciona con normalidad.',
    inactive: 'La empresa queda pausada, sin perder sus datos.',
    suspended: 'Sus miembros no podrán entrar mientras esté suspendida.',
  } satisfies Record<CompanyStatus, string>,
  failed: 'No se pudieron guardar los cambios. Revisa los campos marcados.',
} as const

export const DELETE_COPY = {
  title: (name: string) => `¿Eliminar «${name}»?`,
  effect: (members: number) =>
    members === 0
      ? 'La empresa no tiene miembros, así que nadie perderá acceso.'
      : members === 1
        ? '1 miembro perderá acceso.'
        : `${members} miembros perderán acceso.`,
  details:
    'Cerramos sus sesiones de inmediato. Los datos se conservan y puedes restaurar la empresa cuando quieras.',
  confirmLabel: (name: string) => `Para confirmar, escribe «${name}»`,
  cancel: 'Cancelar',
  submit: 'Eliminar empresa',
  deleted: (name: string, members: number) =>
    members === 0
      ? `Empresa «${name}» eliminada`
      : `Empresa «${name}» eliminada. ${members === 1 ? '1 miembro perdió' : `${members} miembros perdieron`} el acceso.`,
  failed: 'No se pudo eliminar la empresa. Inténtalo de nuevo.',
  restored: (name: string) => `Empresa «${name}» restaurada`,
  restoreFailed: 'No se pudo restaurar la empresa. Inténtalo de nuevo.',
} as const
