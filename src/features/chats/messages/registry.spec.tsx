import type { MessageViewType } from '@chat-crm/contracts'
import { describe, expect, it } from 'vitest'
import { readyMedia } from '../testing/messages'
import { MESSAGE_KINDS, labelOf, messageTypeOf, previewOf, viewTypeOf } from './registry'

describe('message kinds registry', () => {
  it('has an entry for every view kind of the contract', () => {
    const kinds: MessageViewType[] = [
      'text',
      'image',
      'video',
      'audio',
      'document',
      'sticker',
      'template',
      'unsupported',
    ]
    expect(Object.keys(MESSAGE_KINDS).sort()).toEqual([...kinds].sort())
  })

  it('maps stored types to view kinds and back', () => {
    expect(viewTypeOf('image')).toBe('image')
    expect(viewTypeOf('location')).toBe('unsupported')
    expect(viewTypeOf('template')).toBe('template')
    expect(messageTypeOf({ type: 'unsupported', originalType: 'contact', text: null })).toBe(
      'contact'
    )
  })

  it('labels every stored type for the chat list', () => {
    expect(labelOf('image').label).toBe('Foto')
    expect(labelOf('sticker').label).toBe('Sticker')
    expect(labelOf('location').label).toBe('Ubicación')
    expect(labelOf('template').label).toBe('Plantilla')
  })

  it('previews text, captions, voice notes and names', () => {
    expect(previewOf({ type: 'text', text: 'Hola' })).toBe('Hola')
    expect(previewOf({ type: 'image', media: readyMedia(), caption: null })).toBeNull()
    expect(previewOf({ type: 'audio', media: readyMedia(), voice: true })).toBe('Nota de voz')
    expect(
      previewOf({ type: 'document', media: readyMedia(), filename: 'a.pdf', caption: null })
    ).toBe('a.pdf')
  })

  it('previews a sent template by its filled body', () => {
    const view = {
      type: 'template' as const,
      templateId: 'tpl-1',
      name: 'seguimiento_pedido',
      language: 'es',
      header: null,
      body: 'Hola Rosa, tu pedido sale hoy.',
      footer: null,
      buttons: [],
    }
    expect(previewOf(view)).toBe('Hola Rosa, tu pedido sale hoy.')
    expect(messageTypeOf(view)).toBe('template')
  })
})
