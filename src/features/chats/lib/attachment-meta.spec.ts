import { describe, expect, it } from 'vitest'

import { documentMeta, documentTypeLabel, formatFileSize } from './attachment-meta'

describe('documentTypeLabel', () => {
  it('maps known MIME types to their label', () => {
    expect(documentTypeLabel('application/pdf', 'cotizacion.pdf')).toBe('PDF')
    expect(
      documentTypeLabel(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'contrato.docx'
      )
    ).toBe('DOCX')
  })

  it('ignores MIME parameters and casing', () => {
    expect(documentTypeLabel('APPLICATION/PDF; charset=binary', null)).toBe(
      'PDF'
    )
  })

  it('falls back to the filename extension when the MIME type is unknown', () => {
    expect(documentTypeLabel('application/octet-stream', 'plano.dwg')).toBe(
      'DWG'
    )
    expect(documentTypeLabel('application/octet-stream', 'foto.jpg')).toBe(
      'JPG'
    )
  })

  it('uses a simple MIME subtype before giving up', () => {
    expect(documentTypeLabel('application/ogg', null)).toBe('OGG')
    expect(documentTypeLabel('application/vnd.custom-format', null)).toBeUndefined()
  })

  it('returns undefined without MIME type or extension', () => {
    expect(documentTypeLabel(null, 'reporte')).toBeUndefined()
    expect(documentTypeLabel(undefined, null)).toBeUndefined()
  })
})

describe('formatFileSize', () => {
  it('renders bytes below 1 KB as-is', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(0)).toBe('0 B')
  })

  it('renders KB with one decimal below 10', () => {
    expect(formatFileSize(1234)).toBe('1.2 KB')
  })

  it('renders whole units from 10 up', () => {
    expect(formatFileSize(820 * 1024)).toBe('820 KB')
    expect(formatFileSize(2516582)).toBe('2.4 MB')
  })

  it('returns undefined for missing or invalid values', () => {
    expect(formatFileSize(null)).toBeUndefined()
    expect(formatFileSize(undefined)).toBeUndefined()
    expect(formatFileSize(-1)).toBeUndefined()
    expect(formatFileSize(Number.NaN)).toBeUndefined()
  })
})

describe('documentMeta', () => {
  it('joins type and size like WhatsApp', () => {
    expect(
      documentMeta({
        mimeType: 'application/pdf',
        sizeBytes: 2516582,
        filename: 'cotizacion-rosa.pdf',
      })
    ).toBe('PDF · 2.4 MB')
  })

  it('keeps the type when the size is unknown', () => {
    expect(
      documentMeta({
        mimeType: null,
        sizeBytes: null,
        filename: 'cotizacion-rosa.pdf',
      })
    ).toBe('PDF')
  })

  it('returns undefined when there is nothing to show', () => {
    expect(
      documentMeta({ mimeType: null, sizeBytes: null, filename: null })
    ).toBeUndefined()
  })
})
