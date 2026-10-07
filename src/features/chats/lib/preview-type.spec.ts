import { describe, expect, it } from 'vitest'

import { inferPreviewType } from './preview-type'

describe('inferPreviewType', () => {
  it('reads the media kind from the label the strategies write', () => {
    expect(inferPreviewType('Imagen recibida')).toBe('image')
    expect(inferPreviewType('Documento recibido')).toBe('document')
    expect(inferPreviewType('Audio enviado')).toBe('audio')
    expect(inferPreviewType('Video')).toBe('video')
  })

  it('reads the media kind from a bare filename', () => {
    expect(inferPreviewType('transferencia.pdf')).toBe('document')
    expect(inferPreviewType('foto final.jpg')).toBe('image')
    expect(inferPreviewType('nota-de-voz.mp3')).toBe('audio')
    expect(inferPreviewType('clip.MP4')).toBe('video')
    expect(inferPreviewType('presupuesto.XLSX')).toBe('document')
  })

  it('keeps plain text without a kind', () => {
    expect(inferPreviewType('Hola, ¿tienen stock?')).toBe(null)
    expect(inferPreviewType(null)).toBe(null)
    expect(inferPreviewType('Mensaje no soportado')).toBe(null)
  })

  it('lets the live type win over the inference', () => {
    expect(inferPreviewType('foto.jpg', 'document')).toBe('document')
    expect(inferPreviewType('colores.pdf', 'text')).toBe(null)
  })
})
