import {
  ChannelResponseSchema,
  CompanyMemberResponseSchema,
  ConversationAssignmentEntrySchema,
  ConversationListItemSchema,
} from '@chat-crm/contracts'

/**
 * Contract fixtures of the inbox v2 (lists, members with workload, channels,
 * assignment history). Every export goes through its schema's `parse`, so a
 * contract change breaks them loudly. Used by specs and by the explicit dev
 * switch in `lib/dev-fixtures.ts`; never as a production fallback.
 */

const HOUR = 60 * 60 * 1000
const now = Date.now()
const at = (hoursAgo: number) => new Date(now - hoursAgo * HOUR)

export const FIXTURE_CHANNELS = ChannelResponseSchema.array().parse([
  {
    id: 'ch-wa-main',
    type: 'whatsapp',
    name: 'WhatsApp Ventas',
    externalAccountId: '1098765432',
    displayAddress: '+51 1 555 0100',
    status: 'active',
    hasCredentials: true,
    hasAppSecret: true,
    createdAt: at(24 * 90),
    updatedAt: at(24 * 3),
  },
  {
    id: 'ch-wa-support',
    type: 'whatsapp',
    name: 'WhatsApp Soporte',
    externalAccountId: '1098765433',
    displayAddress: '+51 1 555 0200',
    status: 'active',
    hasCredentials: true,
    hasAppSecret: false,
    createdAt: at(24 * 60),
    updatedAt: at(24 * 2),
  },
])

const [sales, support] = FIXTURE_CHANNELS

export const FIXTURE_MEMBERS = CompanyMemberResponseSchema.array().parse([
  {
    id: 'm-ana',
    userId: 'u-ana',
    username: 'ana',
    firstName: 'Ana',
    lastName: 'Torres',
    role: 'admin',
    status: 'active',
    acceptsAutoAssign: true,
    maxOpenConversations: 12,
    openConversations: 4,
    presence: 'available',
    joinedAt: at(24 * 200),
  },
  {
    id: 'm-luis',
    userId: 'u-luis',
    username: 'luis',
    firstName: 'Luis',
    lastName: 'Quispe',
    role: 'agent',
    status: 'active',
    acceptsAutoAssign: true,
    maxOpenConversations: 8,
    openConversations: 8,
    presence: 'away',
    joinedAt: at(24 * 120),
  },
  {
    id: 'm-sofia',
    userId: 'u-sofia',
    username: 'sofia',
    firstName: 'Sofía',
    lastName: 'Ramos',
    role: 'supervisor',
    status: 'active',
    acceptsAutoAssign: false,
    maxOpenConversations: null,
    openConversations: 1,
    presence: 'offline',
    joinedAt: at(24 * 80),
  },
])

export const FIXTURE_CONVERSATIONS = ConversationListItemSchema.array().parse([
  {
    id: 'conv-rosa',
    preview: {
      content: '¿Me confirman el envío para mañana?',
      datetime: at(0.2),
      type: 'text',
    },
    customer: {
      id: 'cus-rosa',
      displayName: 'Rosa Medina',
      phone: '+51987654321',
    },
    channelType: 'whatsapp',
    channel: {
      id: sales.id,
      type: 'whatsapp',
      name: sales.name,
      status: 'active',
      statusReason: null,
    },
    status: 'open',
    priority: 'high',
    assignee: { memberId: 'm-ana', userId: 'u-ana', name: 'Ana Torres' },
    transfer: {
      fromMemberId: 'm-luis',
      fromName: 'Luis Quispe',
      at: at(0.5),
      note: 'Pide factura con RUC, ya tiene cotización.',
    },
    lastInboundAt: at(0.2),
    windowExpiresAt: new Date(now + 23.8 * HOUR),
    unread: 2,
    createdAt: at(30),
  },
  {
    id: 'conv-jorge',
    preview: { content: null, datetime: at(5), type: 'image' },
    customer: {
      id: 'cus-jorge',
      displayName: 'Jorge Salas',
      phone: '+51912345678',
    },
    channelType: 'whatsapp',
    channel: {
      id: support.id,
      type: 'whatsapp',
      name: support.name,
      status: 'active',
      statusReason: null,
    },
    status: 'pending',
    priority: null,
    assignee: { memberId: 'm-ana', userId: 'u-ana', name: 'Ana Torres' },
    transfer: null,
    lastInboundAt: at(22.5),
    windowExpiresAt: new Date(now + 1.5 * HOUR),
    unread: 0,
    createdAt: at(48),
  },
  {
    id: 'conv-lucia',
    preview: {
      content: 'Gracias, quedo atenta.',
      datetime: at(30),
      type: 'text',
    },
    customer: {
      id: 'cus-lucia',
      displayName: 'Lucía Vega',
      phone: '+51955511122',
    },
    channelType: 'whatsapp',
    channel: {
      id: sales.id,
      type: 'whatsapp',
      name: sales.name,
      status: 'active',
      statusReason: null,
    },
    status: 'open',
    priority: 'medium',
    assignee: { memberId: 'm-ana', userId: 'u-ana', name: 'Ana Torres' },
    transfer: null,
    lastInboundAt: at(30),
    windowExpiresAt: at(6),
    unread: 0,
    createdAt: at(72),
  },
  {
    id: 'conv-pedro',
    preview: {
      content: 'Hola, quisiera información',
      datetime: at(0.7),
      type: 'text',
    },
    customer: { id: 'cus-pedro', displayName: null, phone: '+51933344455' },
    channelType: 'whatsapp',
    channel: {
      id: sales.id,
      type: 'whatsapp',
      name: sales.name,
      status: 'active',
      statusReason: null,
    },
    status: 'open',
    priority: null,
    assignee: null,
    transfer: null,
    lastInboundAt: at(0.7),
    windowExpiresAt: new Date(now + 23.3 * HOUR),
    unread: 1,
    createdAt: at(0.7),
  },
  {
    id: 'conv-marta',
    preview: {
      content: 'Perfecto, muchas gracias',
      datetime: at(3),
      type: 'text',
    },
    customer: {
      id: 'cus-marta',
      displayName: 'Marta Ríos',
      phone: '+51966677788',
    },
    channelType: 'whatsapp',
    channel: {
      id: support.id,
      type: 'whatsapp',
      name: support.name,
      status: 'active',
      statusReason: null,
    },
    status: 'closed',
    priority: 'low',
    assignee: { memberId: 'm-luis', userId: 'u-luis', name: 'Luis Quispe' },
    transfer: null,
    lastInboundAt: at(3),
    windowExpiresAt: new Date(now + 21 * HOUR),
    unread: 0,
    createdAt: at(26),
  },
])

const byId = (id: string) => {
  const found = FIXTURE_CONVERSATIONS.find(
    (conversation) => conversation.id === id
  )
  if (!found) throw new Error(`fixture ${id} missing`)
  return found
}

/** Fixture per list tab (`mine` = assigned to Ana, the fixture admin). */
export const FIXTURE_LISTS = {
  mine: FIXTURE_CONVERSATIONS.filter(
    (c) => c.assignee?.memberId === 'm-ana' && c.status !== 'closed'
  ),
  queue: [byId('conv-pedro')],
  needs: [byId('conv-rosa'), byId('conv-pedro')],
  all: FIXTURE_CONVERSATIONS,
}

export const FIXTURE_ASSIGNMENTS =
  ConversationAssignmentEntrySchema.array().parse([
    {
      id: 'as-2',
      memberId: 'm-ana',
      memberName: 'Ana Torres',
      reason: 'transfer',
      note: 'Pide factura con RUC, ya tiene cotización.',
      assignedByMemberId: 'm-luis',
      assignedAt: at(0.5),
      unassignedAt: null,
    },
    {
      id: 'as-1',
      memberId: 'm-luis',
      memberName: 'Luis Quispe',
      reason: 'auto',
      note: null,
      assignedByMemberId: null,
      assignedAt: at(30),
      unassignedAt: at(0.5),
    },
  ])
