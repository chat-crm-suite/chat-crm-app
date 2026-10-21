import {
  SyncTemplatesResultSchema,
  TemplateGroupSchema,
  TemplateSchema,
  templateHeaderMedia,
  templateSendSupport,
  type ChannelType,
  type Template,
  type TemplateComponent,
  type TemplateGroup,
} from '@chat-crm/contracts'

/**
 * Contract fixtures of message templates. Parsed through the schemas so a
 * contract change breaks them loudly; used by specs and by the explicit dev
 * switch (`lib/dev-fixtures.ts`), never as a production fallback.
 */

const DAY = 24 * 60 * 60 * 1000
const now = Date.now()
const at = (daysAgo: number) => new Date(now - daysAgo * DAY)

const base = {
  statusReason: null,
  externalId: null,
  syncedAt: at(0.1),
  updatedAt: at(0.1),
}

/** API-derived fields, computed with the same shared helpers as the API. */
function withDerived<
  T extends { components: TemplateComponent[]; channelType: ChannelType },
>(template: T) {
  return {
    ...template,
    headerMedia: templateHeaderMedia(template.components),
    sendSupport: templateSendSupport(template.components, template.channelType),
  }
}

type RawTemplate = Omit<Template, 'headerMedia' | 'sendSupport'>

const RAW_TEMPLATES: RawTemplate[] = [
  {
    ...base,
    id: 'tpl-seguimiento-sales',
    channelId: 'ch-wa-main',
    channelType: 'whatsapp',
    channelName: 'WhatsApp Ventas',
    name: 'seguimiento_pedido',
    language: 'es',
    category: 'utility',
    status: 'approved',
    externalId: '889900',
    components: [
      { type: 'header', format: 'text', text: 'Tu pedido {{1}}' },
      {
        type: 'body',
        text: 'Hola {{1}}, tu pedido {{2}} sale hoy. Llega el {{3}}.',
      },
      { type: 'footer', text: 'Responde a este mensaje si tienes dudas.' },
      {
        type: 'buttons',
        buttons: [{ type: 'quick_reply', text: 'Gracias' }],
      },
    ],
    variables: [
      {
        key: '1',
        component: 'header',
        label: 'Número de pedido',
        example: 'PED-1043',
      },
      {
        key: '1',
        component: 'body',
        label: 'Nombre del cliente',
        example: 'Rosa',
      },
      { key: '2', component: 'body', label: null, example: 'PED-1043' },
      {
        key: '3',
        component: 'body',
        label: 'Fecha de entrega',
        example: '12 de octubre',
      },
    ],
    visibleToAgents: true,
  },
  {
    ...base,
    id: 'tpl-seguimiento-support',
    channelId: 'ch-wa-support',
    channelType: 'whatsapp',
    channelName: 'WhatsApp Soporte',
    name: 'seguimiento_pedido',
    language: 'es',
    category: 'utility',
    status: 'pending',
    components: [
      {
        type: 'body',
        text: 'Hola {{1}}, tu pedido {{2}} sale hoy. Llega el {{3}}.',
      },
    ],
    variables: [
      { key: '1', component: 'body', label: null, example: 'Rosa' },
      { key: '2', component: 'body', label: null, example: 'PED-1043' },
      { key: '3', component: 'body', label: null, example: '12 de octubre' },
    ],
    visibleToAgents: true,
  },
  {
    ...base,
    id: 'tpl-retomar',
    channelId: 'ch-wa-main',
    channelType: 'whatsapp',
    channelName: 'WhatsApp Ventas',
    name: 'retomar_conversacion',
    language: 'es',
    category: 'marketing',
    status: 'approved',
    components: [
      {
        type: 'body',
        text: 'Hola {{1}}, ¿seguimos con tu consulta? Escríbenos y te atendemos.',
      },
    ],
    variables: [
      {
        key: '1',
        component: 'body',
        label: 'Nombre del cliente',
        example: 'Rosa',
      },
    ],
    visibleToAgents: true,
  },
  {
    ...base,
    id: 'tpl-bienvenida',
    channelId: 'ch-wa-main',
    channelType: 'whatsapp',
    channelName: 'WhatsApp Ventas',
    name: 'bienvenida',
    language: 'es',
    category: 'marketing',
    status: 'approved',
    components: [
      {
        type: 'body',
        text: '¡Gracias por escribirnos! Un asesor te atenderá en breve.',
      },
    ],
    variables: [],
    visibleToAgents: false,
  },
  {
    ...base,
    id: 'tpl-promo',
    channelId: 'ch-wa-main',
    channelType: 'whatsapp',
    channelName: 'WhatsApp Ventas',
    name: 'promo_octubre',
    language: 'es',
    category: 'marketing',
    status: 'rejected',
    statusReason: 'INVALID_FORMAT',
    components: [{ type: 'body', text: '20% de descuento este mes.' }],
    variables: [],
    visibleToAgents: false,
    syncedAt: at(3),
  },
  {
    ...base,
    id: 'tpl-promo-imagen',
    channelId: 'ch-wa-main',
    channelType: 'whatsapp',
    channelName: 'WhatsApp Ventas',
    name: 'promo_con_imagen',
    language: 'es',
    category: 'marketing',
    status: 'approved',
    components: [
      { type: 'header', format: 'image', text: null },
      {
        type: 'body',
        text: 'Envío gratis en todos los pedidos de esta semana.',
      },
      { type: 'footer', text: 'Tienda Rosa' },
      {
        type: 'buttons',
        buttons: [
          { type: 'url', text: 'Ver ofertas', url: 'https://example.com' },
        ],
      },
    ],
    variables: [],
    visibleToAgents: true,
  },
  {
    ...base,
    id: 'tpl-carrusel',
    channelId: 'ch-wa-main',
    channelType: 'whatsapp',
    channelName: 'WhatsApp Ventas',
    name: 'catalogo_carrusel',
    language: 'es',
    category: 'marketing',
    status: 'approved',
    components: [
      { type: 'body', text: 'Mira nuestras novedades de temporada.' },
      { type: 'carousel' },
    ],
    variables: [],
    visibleToAgents: true,
  },
]

export const FIXTURE_TEMPLATES = TemplateSchema.array().parse(
  RAW_TEMPLATES.map(withDerived)
)

const pick = (template: Template) => ({
  id: template.id,
  channelId: template.channelId,
  channelType: template.channelType,
  channelName: template.channelName,
  language: template.language,
  status: template.status,
  visibleToAgents: template.visibleToAgents,
  syncedAt: template.syncedAt,
})

function group(templates: Template[]): TemplateGroup[] {
  const byName = new Map<string, Template[]>()
  for (const template of templates) {
    byName.set(template.name, [...(byName.get(template.name) ?? []), template])
  }
  return TemplateGroupSchema.array().parse(
    [...byName.entries()].map(([name, items]) => ({
      name,
      category: items[0].category,
      multiChannel: new Set(items.map((item) => item.channelId)).size > 1,
      templates: items.map(pick),
    }))
  )
}

export const FIXTURE_TEMPLATE_GROUPS = group(FIXTURE_TEMPLATES)

export const FIXTURE_SYNC_RESULT = SyncTemplatesResultSchema.parse({
  channelId: 'ch-wa-support',
  total: 1,
  created: 0,
  updated: 1,
  disabled: 0,
  statusChanges: [
    {
      templateId: 'tpl-seguimiento-support',
      name: 'seguimiento_pedido',
      language: 'es',
      from: 'pending',
      to: 'approved',
    },
  ],
  syncedAt: new Date(now),
})
