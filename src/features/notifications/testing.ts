import type { NotificationItem } from '@chat-crm/contracts'

/** A contract-valid notification row for specs. */
export function makeNotification(
  overrides: Partial<NotificationItem> = {}
): NotificationItem {
  return {
    id: '01a15a77-0000-7000-8000-000000000001',
    companyId: 'c1',
    type: 'conversation_assigned',
    severity: 'info',
    title: 'Nuevo chat asignado',
    body: 'Ana espera tu respuesta',
    data: { conversationId: 'conv-1' },
    groupKey: null,
    count: 1,
    readAt: null,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
    ...overrides,
  }
}
