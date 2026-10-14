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
      'unsupported',
    ]
    expect(Object.keys(MESSAGE_KINDS).sort()).toEqual([...kinds].sort())
  })

  it('maps stored types to view kinds and back', () => {
    expect(viewTypeOf('image')).toBe('image')
    expect(viewTypeOf('location')).toBe('unsupported')
    expect(messageTypeOf({ type: 'unsupported', originalType: 'contact', text: null })).toBe(
      'contact'
    )
  })

  it('labels every stored type for the chat list', () => {
    expect(labelOf('image').label).toBe('Foto')
    expect(labelOf('sticker').label).toBe('Sticker')
    expect(labelOf('location').label).toBe('Ubicación')
  })

  it('previews text, captions, voice notes and names', () => {
    expect(previewOf({ type: 'text', text: 'Hola' })).toBe('Hola')
    expect(previewOf({ type: 'image', media: readyMedia(), caption: null })).toBeNull()
    expect(previewOf({ type: 'audio', media: readyMedia(), voice: true })).toBe('Nota de voz')
    expect(
      previewOf({ type: 'document', media: readyMedia(), filename: 'a.pdf', caption: null })
    ).toBe('a.pdf')
  })
})
