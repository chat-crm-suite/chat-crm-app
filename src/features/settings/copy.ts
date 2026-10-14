import type { NotificationType } from '@chat-crm/contracts'

/** User-facing Spanish copy for the settings screens. */

export const SAVED_TOAST = 'Cambios guardados'

export const PROFILE_COPY = {
  title: 'Perfil',
  description:
    'Cómo te ven tus compañeros en los chats y en el equipo. Tu usuario es el que usas para iniciar sesión.',
  avatarChange: 'Cambiar foto',
  avatarHint: 'JPG, PNG o WebP. La recortamos en cuadrado y la reducimos a 256 px.',
  avatarUploaded: 'Foto actualizada',
  avatarFailed: 'No se pudo subir la foto. Prueba con otra imagen.',
  avatarNotImage: 'Ese archivo no es una imagen. Elige un JPG, PNG o WebP.',
  avatarTooBig: 'La foto pesa más de 2 MB incluso reducida. Elige otra imagen.',
  personalSection: 'Datos personales',
  personalSectionHint: 'Se muestran junto a tus mensajes.',
  firstName: 'Nombre',
  lastName: 'Apellidos',
  phone: 'Teléfono',
  email: 'Correo',
  emailHint: 'Lo usamos para avisos de la cuenta y para recuperar el acceso.',
  username: 'Usuario',
  usernameHint: 'No se puede cambiar. Es el que escribes al iniciar sesión.',
  saveFailed: 'No se pudieron guardar los cambios. Revisa los campos marcados.',
  emailTaken: 'Ese correo ya pertenece a otra cuenta.',
} as const

export const SECURITY_COPY = {
  title: 'Seguridad',
  description:
    'Cambia tu contraseña y decide dónde tienes la sesión abierta.',
  passwordSection: 'Contraseña',
  passwordSectionHint:
    'Al cambiarla cerramos tus otras sesiones; esta sigue abierta.',
  current: 'Contraseña actual',
  next: 'Nueva contraseña',
  nextHint: 'Mínimo 8 caracteres.',
  confirm: 'Repite la nueva contraseña',
  mismatch: 'Las contraseñas no coinciden.',
  wrongCurrent: 'La contraseña actual no es correcta.',
  sameAsCurrent: 'La nueva contraseña debe ser distinta de la actual.',
  submit: 'Cambiar contraseña',
  changed: 'Contraseña actualizada',
  changeFailed: 'No se pudo cambiar la contraseña. Inténtalo de nuevo.',
  sessionsSection: 'Sesiones',
  sessionsHint:
    'Cierra tu sesión en el celular, en el computador y en cualquier otro navegador. Tendrás que volver a iniciar sesión.',
  revokeAll: 'Cerrar sesión en todos los dispositivos',
  revokeTitle: '¿Cerrar todas las sesiones?',
  revokeDescription:
    'Saldrás de tu cuenta en todos los dispositivos, también en este. Podrás volver a entrar con tu usuario y contraseña.',
  revokeConfirm: 'Cerrar todas las sesiones',
  revokeFailed: 'No se pudieron cerrar las sesiones. Inténtalo de nuevo.',
} as const

export const NOTIFICATION_COPY = {
  title: 'Notificaciones',
  description:
    'Elige de qué te avisamos. Los cambios se guardan al instante.',
  serverSection: 'Avisos de esta empresa',
  serverSectionHint:
    'Se aplican a tu cuenta en la empresa activa. Si trabajas en varias, cada una tiene sus propios avisos.',
  deviceSection: 'En este dispositivo',
  deviceSectionHint: 'Estas opciones solo valen para este navegador.',
  sound: 'Sonido con mensajes nuevos',
  soundHint: 'Suena un aviso corto cuando llega una notificación.',
  desktop: 'Avisos del escritorio',
  desktopHint: 'El navegador muestra un aviso aunque esta pestaña esté en segundo plano.',
  desktopBlocked:
    'El navegador bloqueó los avisos. Actívalos desde la configuración del sitio y vuelve a intentarlo.',
  desktopUnsupported: 'Este navegador no admite avisos del escritorio.',
  saveFailed: 'No se pudo guardar. Se restauró tu elección anterior.',
  loadFailed: 'No se pudieron cargar tus avisos.',
  retry: 'Reintentar',
} as const

export const NOTIFICATION_TYPE_COPY: Record<
  NotificationType,
  { label: string; description: string }
> = {
  conversation_assigned: {
    label: 'Conversación asignada',
    description: 'Te avisamos cuando te asignan una conversación.',
  },
  queue_unassigned: {
    label: 'Conversaciones sin responsable',
    description:
      'Te avisamos cuando una conversación queda en la cola sin nadie a cargo.',
  },
  spend_budget: {
    label: 'Presupuesto de mensajes',
    description:
      'Te avisamos cuando el gasto de mensajes se acerca al límite del mes.',
  },
}

export const APPEARANCE_COPY = {
  title: 'Apariencia',
  description: 'Cómo se ve la aplicación en este dispositivo.',
  themeSection: 'Tema',
  themeHint: 'El tema del sistema sigue la configuración de tu equipo.',
  themes: {
    light: 'Claro',
    dark: 'Oscuro',
    system: 'Igual que el sistema',
  },
  textSection: 'Tamaño del texto',
  textHint: 'Agranda todo el contenido si te cuesta leer.',
  textSizes: {
    normal: 'Normal',
    large: 'Grande',
    larger: 'Muy grande',
  },
} as const

export const COMPANY_COPY = {
  title: 'Datos de la empresa',
  description:
    'Los datos con los que se identifica tu empresa. La zona horaria define el reloj de los reportes.',
  section: 'Datos generales',
  name: 'Nombre',
  email: 'Correo de contacto',
  phone: 'Teléfono',
  address: 'Dirección',
  timezone: 'Zona horaria',
  timezoneSearch: 'Buscar zona horaria',
  timezoneEmpty: 'No hay zonas con ese nombre.',
  readOnly:
    'Solo un administrador puede cambiar los datos de la empresa. Tú puedes consultarlos.',
  saveFailed: 'No se pudieron guardar los datos. Revisa los campos marcados.',
  loadFailed: 'No se pudieron cargar los datos de la empresa.',
  retry: 'Reintentar',
} as const

export const ASSIGNMENT_COPY = {
  title: 'Asignación automática',
  description:
    'Cómo se reparten las conversaciones nuevas entre tu equipo cuando nadie las tomó.',
  section: 'Reparto',
  enabled: 'Asignar conversaciones automáticamente',
  enabledHint: 'Las conversaciones nuevas se reparten entre los agentes disponibles.',
  maxOpen: 'Conversaciones abiertas por agente',
  maxOpenHint:
    'Un agente deja de recibir asignaciones al llegar a este número. En Equipo puedes dar un límite distinto a cada persona.',
  sticky: 'Volver al agente anterior',
  stickyHint:
    'Si el cliente vuelve a escribir, la conversación va al mismo agente mientras esté disponible.',
  notify: 'Avisar a los supervisores',
  notifyHint:
    'Los supervisores reciben un aviso cuando una conversación se queda sin responsable.',
  readOnly:
    'Solo un administrador puede cambiar la asignación. Tú puedes consultarla.',
  saveFailed: 'No se pudo guardar la asignación. Revisa los valores.',
  loadFailed: 'No se pudo cargar la asignación.',
  retry: 'Reintentar',
} as const

export const WHATSAPP_COPY = {
  title: 'WhatsApp',
  description:
    'Conecta el número de WhatsApp Business con el que tu empresa atiende a los clientes.',
} as const
