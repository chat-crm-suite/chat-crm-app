import { describe, expect, it } from 'vitest'
import {
  clearSelfInitiatedAssignment,
  consumeSelfInitiatedAssignment,
  markSelfInitiatedAssignment,
  notificationToastPayload,
  prependNotification,
  resolveAssignmentToast,
  resolveErrorToast,
} from './socket-taxonomy'

describe('resolveErrorToast', () => {
  it('maps a v2 provider error without action to the detail toast', () => {
    const decision = resolveErrorToast({
      code: 131047,
      title: 'Re-engagement message',
      message: 'Message failed to send because more than 24 hours have passed',
      error_data: { details: 'Message failed to send' },
    })

    expect(decision).toEqual({
      kind: 'detail',
      title: 'Re-engagement message',
      description: 'Message failed to send',
    })
  })

  it('offers the template action when the payload carries hasAction', () => {
    const decision = resolveErrorToast({
      type: 'webhook_status_error',
      message: 'WhatsApp Webhook Status Error',
      hasAction: true,
      to: '+51999888777',
    })

    expect(decision).toEqual({
      kind: 'template',
      title: 'webhook_status_error',
      description: 'WhatsApp Webhook Status Error',
      recipient: '+51999888777',
    })
  })

  it('falls back to the message detail and a generic title for a partial payload', () => {
    expect(resolveErrorToast({ message: 'Boom' })).toEqual({
      kind: 'detail',
      title: 'Error al enviar el mensaje',
      description: 'Boom',
    })
  })

  it('never crashes on an empty payload', () => {
    expect(resolveErrorToast(undefined)).toEqual({
      kind: 'detail',
      title: 'Error al enviar el mensaje',
    })
  })
})

describe('notificationToastPayload', () => {
  it('maps the realtime notification title and body', () => {
    expect(
      notificationToastPayload({
        id: 'n-1',
        title: 'Nuevo chat asignado',
        body: 'Tenés un chat nuevo esperando respuesta',
      })
    ).toEqual({
      title: 'Nuevo chat asignado',
      body: 'Tenés un chat nuevo esperando respuesta',
    })
  })

  it('falls back to a generic title when the notification has no title', () => {
    expect(notificationToastPayload({ body: 'Solo cuerpo' })).toEqual({
      title: 'Nuevo mensaje',
      body: 'Solo cuerpo',
    })
  })

  it('never crashes on an empty payload', () => {
    expect(notificationToastPayload(null)).toEqual({ title: 'Nuevo mensaje' })
  })
})

describe('prependNotification', () => {
  it('prepends the live notification to the cached list', () => {
    const previous = [{ id: 'n-1', title: 'Vieja' }]
    const incoming = { id: 'n-2', title: 'Nueva' }

    expect(prependNotification(previous, incoming)).toEqual([
      incoming,
      ...previous,
    ])
  })

  it('starts the cache when no list is loaded yet', () => {
    const incoming = { id: 'n-1', title: 'Nueva' }

    expect(prependNotification(undefined, incoming)).toEqual([incoming])
  })

  it('replaces a notification that arrives twice instead of duplicating it', () => {
    const first = { id: 'n-1', title: 'Nueva' }
    const second = { id: 'n-1', title: 'Nueva', readAt: '2026-10-06T10:00:00Z' }

    expect(prependNotification([first], second)).toEqual([second])
  })
})

describe('resolveAssignmentToast', () => {
  it('maps an assigned event to a success toast with a stable id', () => {
    expect(
      resolveAssignmentToast('assigned', {
        conversationId: 'c-1',
        memberId: 'm-1',
      })
    ).toEqual({
      type: 'success',
      title: 'Chat asignado a tu nombre',
      id: 'assignment:c-1',
    })
  })

  it('stays silent when the event echoes the current user own action', () => {
    expect(
      resolveAssignmentToast(
        'assigned',
        { conversationId: 'c-1' },
        { isSelfInitiated: () => true }
      )
    ).toBeNull()
  })

  it('maps an unassigned event to an info toast', () => {
    expect(
      resolveAssignmentToast('unassigned', { conversationId: 'c-2' })
    ).toEqual({
      type: 'info',
      title: 'Chat sin asignar',
      description: 'Hay un chat esperando agente en la cola',
      id: 'assignment:c-2',
    })
  })

  it('keeps the unassigned info toast even with a self-initiated mark', () => {
    expect(
      resolveAssignmentToast(
        'unassigned',
        { conversationId: 'c-1' },
        { isSelfInitiated: () => true }
      )
    ).toEqual({
      type: 'info',
      title: 'Chat sin asignar',
      description: 'Hay un chat esperando agente en la cola',
      id: 'assignment:c-1',
    })
  })

  it('still decides on a payload without a conversation id', () => {
    expect(resolveAssignmentToast('assigned', undefined)).toEqual({
      type: 'success',
      title: 'Chat asignado a tu nombre',
    })
  })
})

describe('self-initiated assignment tracker', () => {
  it('consumes a mark once, so only the own-action echo is silenced', () => {
    markSelfInitiatedAssignment('c-1')

    expect(consumeSelfInitiatedAssignment('c-1')).toBe(true)
    expect(consumeSelfInitiatedAssignment('c-1')).toBe(false)
  })

  it('clears a mark when the local action fails', () => {
    markSelfInitiatedAssignment('c-2')
    clearSelfInitiatedAssignment('c-2')

    expect(consumeSelfInitiatedAssignment('c-2')).toBe(false)
  })

  it('never reports unknown conversations as self-initiated', () => {
    expect(consumeSelfInitiatedAssignment('c-unknown')).toBe(false)
  })
})
