import { describe, expect, it, vi } from 'vitest'
import type { MessageBodyProps } from '../message-kind'
import { MESSAGE_KINDS } from '../registry'
import { bodyFor } from '.'

function WhatsAppText(_props: MessageBodyProps<'text'>) {
  return null
}

// A channel that overrides one kind; every other kind keeps the common view.
vi.mock('./whatsapp', () => ({ whatsappBodies: { text: WhatsAppText } }))

describe('bodyFor (channel-specific message views)', () => {
  const text = { type: 'text' as const, text: 'Hola' }
  const template = {
    type: 'template' as const,
    templateId: null,
    name: 'bienvenida',
    language: 'es',
    header: null,
    body: 'Gracias por escribirnos',
    footer: null,
    buttons: [],
  }

  it("uses the channel's own view when it has one", () => {
    expect(bodyFor(text, 'whatsapp')).toBe(WhatsAppText)
  })

  it('falls back to the channel-agnostic view for kinds a channel does not override', () => {
    expect(bodyFor(template, 'whatsapp')).toBe(MESSAGE_KINDS.template.Body)
  })

  it('falls back for channels without overrides and for an unknown channel', () => {
    expect(bodyFor(text, 'telegram')).toBe(MESSAGE_KINDS.text.Body)
    expect(bodyFor(text, null)).toBe(MESSAGE_KINDS.text.Body)
    expect(bodyFor(text)).toBe(MESSAGE_KINDS.text.Body)
  })
})
