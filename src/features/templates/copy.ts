import type {
  TemplateCategory,
  TemplateHeaderMedia,
  TemplateStatus,
  TemplateUnsendableReason,
} from '@chat-crm/contracts'

/** User-facing Spanish copy of Plantillas (code stays in English). */

export const TEMPLATE_STATUS_LABEL: Record<TemplateStatus, string> = {
  approved: 'Aprobada',
  pending: 'En revisión',
  rejected: 'Rechazada',
  paused: 'Pausada',
  disabled: 'Deshabilitada',
}

/** Tint per status (theme tokens only). */
export const TEMPLATE_STATUS_TINT: Record<TemplateStatus, string> = {
  approved: 'bg-(--positive)/12 text-foreground',
  pending: 'bg-warning/15 text-foreground',
  rejected: 'bg-destructive/12 text-destructive',
  paused: 'bg-muted text-muted-foreground',
  disabled: 'bg-muted text-muted-foreground',
}

export const TEMPLATE_STATUS_DOT: Record<TemplateStatus, string> = {
  approved: 'bg-(--positive)',
  pending: 'bg-warning',
  rejected: 'bg-destructive',
  paused: 'bg-muted-foreground/60',
  disabled: 'bg-muted-foreground/40',
}

export const TEMPLATE_CATEGORY_LABEL: Record<TemplateCategory, string> = {
  marketing: 'Marketing',
  utility: 'Utilidad',
  authentication: 'Autenticación',
}

export const COMPONENT_LABEL = {
  header: 'Encabezado',
  body: 'Cuerpo',
  footer: 'Pie',
  buttons: 'Botones',
  carousel: 'Carrusel',
} as const

/** Why the CRM cannot send a template yet (`sendSupport.reason`). */
export const TEMPLATE_UNSENDABLE_LABEL: Record<TemplateUnsendableReason, string> = {
  carousel:
    'Carrusel sin tarjetas o no admitido por este canal: sincroniza las plantillas',
  location_header:
    'Encabezado de ubicación: aún no se puede enviar desde el CRM',
  header_media_unsupported:
    'Este canal no admite el archivo que pide el encabezado',
}

/** The header file a template asks for, by kind. */
export const HEADER_MEDIA_LABEL: Record<TemplateHeaderMedia, string> = {
  image: 'Imagen del encabezado',
  video: 'Video del encabezado',
  document: 'Documento del encabezado',
}

/** A carousel card's file, by kind (`Imagen de la tarjeta 1`). */
const CARD_MEDIA_NOUN: Record<TemplateHeaderMedia, string> = {
  image: 'Imagen',
  video: 'Video',
  document: 'Documento',
}

export const copy = {
  title: 'Plantillas',
  description:
    'Mensajes aprobados por cada canal: la única forma de escribir fuera de la ventana de respuesta.',
  search: 'Buscar plantilla…',
  allChannels: 'Todos los canales',
  allStatuses: 'Todos los estados',
  multiChannel: 'Multicanal',
  colName: 'Plantilla',
  colChannel: 'Canal',
  colLanguage: 'Idioma',
  colCategory: 'Categoría',
  colStatus: 'Estado',
  colVisible: 'Visible a agentes',
  colSynced: 'Última sync',
  visibleYes: 'Sí',
  visibleNo: 'No',
  neverSynced: 'Nunca',
  empty: 'Aún no hay plantillas.',
  emptyAdminHint:
    'Sincroniza un canal para traer las plantillas aprobadas en Meta Business Manager.',
  emptyAgentHint: 'Un administrador debe sincronizarlas y hacerlas visibles.',
  noMatches: 'Ninguna plantilla coincide con los filtros.',
  loadError: 'No se pudieron cargar las plantillas.',
  sync: 'Sincronizar',
  syncChannel: (name: string) => `Sincronizar ${name}`,
  syncing: 'Sincronizando…',
  syncNoChannels: 'No hay canales con plantillas.',
  syncDone: (total: number) =>
    `${total} ${total === 1 ? 'plantilla sincronizada' : 'plantillas sincronizadas'}`,
  syncSummary: (created: number, updated: number, disabled: number) =>
    [
      created && `${created} nuevas`,
      updated && `${updated} actualizadas`,
      disabled && `${disabled} deshabilitadas`,
    ]
      .filter(Boolean)
      .join(' · ') || 'Sin cambios',
  syncError: 'No se pudo sincronizar el canal.',
  checkStatus: 'Consultar estado con WhatsApp',
  statusChanged: (name: string, to: string) => `${name}: ahora ${to}`,
  readOnly: 'Solo un administrador puede sincronizar o cambiar los ajustes.',

  // Detail sheet
  detailPreview: 'Vista previa',
  detailVariables: 'Variables',
  detailNoVariables: 'Esta plantilla no tiene variables.',
  detailSettings: 'Ajustes en el CRM',
  detailVisibleLabel: 'Visible para agentes',
  detailVisibleHint:
    'Los agentes solo ven y envían plantillas aprobadas con esta opción.',
  detailLabelFor: (key: string) => `Etiqueta de {{${key}}}`,
  detailSave: 'Guardar ajustes',
  detailSaved: 'Ajustes guardados',
  detailSaveError: 'No se pudieron guardar los ajustes.',
  detailReason: 'Motivo',
  detailEditInMeta: 'Editar contenido en Meta Business Manager',
  detailExample: 'Ejemplo',
  detailComponent: 'Parte',
  detailLabel: 'Etiqueta',

  // Picker (chat + new chat)
  pickerTitle: 'Enviar plantilla',
  pickerDescription: 'Plantillas aprobadas de este canal.',
  pickerEmpty: 'No hay plantillas aprobadas para este canal.',
  pickerEmptyHint: 'Pide a un administrador que sincronice las plantillas.',
  pickerSearch: 'Buscar por nombre…',
  pickerChoose: 'Elige una plantilla para ver la vista previa.',
  pickerSend: 'Enviar plantilla',
  pickerSending: 'Enviando…',
  pickerSent: 'Plantilla enviada',
  pickerError: 'No se pudo enviar la plantilla.',
  pickerMissing: (count: number) =>
    count === 1 ? 'Falta 1 variable' : `Faltan ${count} variables`,
  pickerBack: 'Plantillas',
  pickerMissingHeader: 'Faltan archivos por adjuntar',
  carouselLabel: 'Tarjetas del carrusel',
  cardLabel: (card: number) => `Tarjeta ${card + 1}`,
  cardButtonVariable: 'Final del enlace',
  cardFileLabel: (kind: TemplateHeaderMedia, card: number) =>
    `${CARD_MEDIA_NOUN[kind]} de la tarjeta ${card + 1}`,
  headerBadFormat: (name: string) => `«${name}» no es un formato admitido para este archivo.`,
  headerTooLarge: (name: string, size: string) => `«${name}» supera ${size}.`,
  headerChoose: 'Elegir archivo',
  headerReplace: 'Cambiar',
  headerRemove: 'Quitar archivo',
  headerUploading: 'Subiendo…',
  headerReady: 'Listo para enviar',
  headerHint: (formats: string, size: string) => `${formats} · hasta ${size}`,
  headerUploadError: 'No se pudo subir el archivo.',
  variable: (key: string) => `Variable {{${key}}}`,
  noTemplate: 'Sin plantilla',
} as const

/** Business Manager page where the content of WhatsApp templates is edited. */
export const META_TEMPLATES_URL =
  'https://business.facebook.com/wa/manage/message-templates/'
