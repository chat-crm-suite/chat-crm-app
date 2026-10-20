import { describe, expect, it } from 'vitest'
import { resolveErrorToast } from './socket-taxonomy'

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
