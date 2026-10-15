import type { ConversationStatus, CustomerSource } from '@chat-crm/contracts'
import { plural } from '../workspace/form-utils'

/** User-facing Spanish copy of Clientes (code stays in English). */

export const SOURCE_LABEL: Record<CustomerSource, string> = {
  whatsapp: 'WhatsApp',
  manual: 'Manual',
  import: 'Importado',
  api: 'API',
}

export const CONVERSATION_LABEL: Partial<Record<ConversationStatus, string>> = {
  open: 'Abierta',
  pending: 'Pendiente',
}

export const API_ERROR_COPY: Record<string, string> = {
  invalid_phone: 'Revisa el número: incluye el código de país, por ejemplo +51 987 654 321.',
  unknown_stage: 'Esa etapa ya no existe. Elige otra.',
  unknown_owner: 'Ese responsable ya no está en el equipo. Elige otro.',
  unknown_tag: 'Una de las etiquetas ya no existe. Recarga la lista.',
  tag_exists: 'Ya existe una etiqueta con ese nombre.',
}

export const copy = {
  title: 'Clientes',
  purpose: 'Quién te escribe, en qué etapa está y quién lo atiende.',
  add: 'Nuevo cliente',
  import: 'Importar CSV',
  importing: 'Importando…',
  searchPlaceholder: 'Buscar cliente',
  count: (total: number) => plural(total, 'cliente', 'clientes'),
  filters: {
    stage: 'Etapa',
    owner: 'Responsable',
    tags: 'Etiquetas',
    source: 'Origen',
    noOwner: 'Sin responsable',
  },
  columns: {
    customer: 'Cliente',
    email: 'Correo',
    tags: 'Etiquetas',
    stage: 'Etapa',
    owner: 'Responsable',
    lastInteraction: 'Última interacción',
    conversations: 'Conversaciones',
    source: 'Origen',
  },
  noOwner: 'Sin responsable',
  noStage: 'Sin etapa',
  noContact: 'Sin contacto',
  noName: 'Sin nombre',
  conversationsCount: (count: number) =>
    count === 0 ? 'Ninguna' : plural(count, 'conversación', 'conversaciones'),
  openConversationLink: (name: string) => `Abrir la conversación de ${name}`,
  selectAll: 'Seleccionar todos los clientes de esta página',
  selectOne: (name: string) => `Seleccionar a ${name}`,
  actionsLabel: (name: string) => `Acciones de ${name}`,
  menu: { open: 'Ver detalle', edit: 'Editar', remove: 'Eliminar' },
  empty: {
    title: 'Todavía no tienes clientes',
    description:
      'Llegan solos cuando alguien escribe por WhatsApp. También puedes agregarlos a mano o importarlos desde un CSV.',
  },
  loadError: 'No pudimos cargar los clientes',
  form: {
    createTitle: 'Nuevo cliente',
    createDescription:
      'Con el teléfono basta. Si ese número ya fue cliente y se eliminó, lo restauramos.',
    editTitle: 'Editar cliente',
    createSubmit: 'Crear cliente',
    editSubmit: 'Guardar cambios',
    contact: 'Contacto',
    follow: 'Seguimiento',
    phone: 'Teléfono',
    displayName: 'Nombre para mostrar',
    firstName: 'Nombre',
    lastName: 'Apellido',
    email: 'Correo',
    stage: 'Etapa',
    stagePlaceholder: 'Etapa inicial',
    owner: 'Responsable',
    ownerPlaceholder: 'Sin responsable',
    atLeastOne: 'Escribe al menos un teléfono o un nombre.',
    created: 'Cliente creado',
    restored: 'Cliente restaurado',
    saved: 'Cambios guardados',
    exists: 'Ya existe un cliente con ese teléfono.',
    viewExisting: 'Ver cliente',
  },
  detail: {
    contact: 'Contacto',
    phone: 'Teléfono',
    email: 'Correo',
    follow: 'Seguimiento',
    stage: 'Etapa',
    owner: 'Responsable',
    tags: 'Etiquetas',
    conversations: 'Conversaciones',
    openConversation: 'Abrir conversación',
    noOpenConversation: 'No hay una conversación abierta.',
    edit: 'Editar',
    remove: 'Eliminar',
    updated: 'Cliente actualizado',
    notFound: 'Este cliente ya no existe.',
    notFoundHint: 'Se eliminó o no pertenece a esta empresa. Vuelve a la lista para elegir otro.',
    noStage: 'Sin etapa',
    addTag: 'Agregar etiqueta',
    tagPlaceholder: 'Busca o crea una etiqueta',
    createTag: (name: string) => `Crear «${name}»`,
    removeTag: (name: string) => `Quitar la etiqueta ${name}`,
    noTags: 'Sin etiquetas',
    ownerPlaceholder: 'Elegir responsable',
    searchOwner: 'Buscar miembro',
    noMembers: 'Nadie coincide.',
  },
  remove: {
    title: (name: string) => `¿Eliminar a ${name}?`,
    description:
      'Dejará de aparecer en la lista. Si vuelve a escribir por WhatsApp o lo importas otra vez, se restaura con su historial.',
    confirm: 'Eliminar cliente',
    cancel: 'Cancelar',
    done: 'Cliente eliminado',
  },
  bulk: {
    noun: ['cliente', 'clientes'] as [string, string],
    remove: 'Eliminar',
    title: (count: number) =>
      count === 1 ? '¿Eliminar 1 cliente?' : `¿Eliminar ${count} clientes?`,
    description:
      'Dejarán de aparecer en la lista. Si vuelven a escribir por WhatsApp o los importas otra vez, se restauran con su historial.',
    confirm: (count: number) =>
      count === 1 ? 'Eliminar 1 cliente' : `Eliminar ${count} clientes`,
    done: (count: number) =>
      count === 1 ? '1 cliente eliminado' : `${count} clientes eliminados`,
  },
  importResult: (created: number, restored: number, skipped: number) =>
    `${created} creados, ${restored} restaurados, ${skipped} omitidos`,
  importFailed: 'No se pudo importar el archivo. Revisa que sea un CSV con una fila por cliente.',
  genericError: 'No se pudo completar la acción. Inténtalo de nuevo.',
}
