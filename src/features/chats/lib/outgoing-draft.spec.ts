import { describe, expect, it } from 'vitest'
import { optimisticView, toOutgoingMessage } from './outgoing-draft'

const UPLOAD_ID = '0b9f6a3e-5c1d-4f7e-9a2b-3c4d5e6f7a8b'
const file = (name: string, type: string) => new File(['x'], name, { type })

describe('outgoing drafts', () => {
  it('previews a file as a pending media view with what the composer knows', () => {
    expect(
      optimisticView({
        type: 'audio',
        file: file('nota.webm', 'audio/webm'),
        voice: true,
        durationMs: 4200,
      })
    ).toEqual({
      type: 'audio',
      voice: true,
      media: {
        attachmentId: null,
        url: null,
        status: 'pending',
        mimeType: 'audio/webm',
        sizeBytes: 1,
        durationMs: 4200,
        width: null,
        height: null,
      },
    })
  })

  it('names documents after their file', () => {
    expect(
      optimisticView({ type: 'document', file: file('cotizacion.pdf', 'application/pdf') })
    ).toMatchObject({ type: 'document', filename: 'cotizacion.pdf', caption: null })
  })

  it('builds the contract payload once the file is staged, dropping blank captions', () => {
    expect(
      toOutgoingMessage({ type: 'image', file: file('a.png', 'image/png'), caption: '  ' }, UPLOAD_ID)
    ).toEqual({ type: 'image', uploadId: UPLOAD_ID, caption: undefined })
    expect(
      toOutgoingMessage({ type: 'sticker', attachmentId: 'att-9', previewUrl: '/x' }, null)
    ).toEqual({ type: 'sticker', source: { attachmentId: 'att-9' } })
  })

  it('refuses to build a media payload before its upload', () => {
    expect(() =>
      toOutgoingMessage({ type: 'video', file: file('v.mp4', 'video/mp4') }, null)
    ).toThrow('needs its upload first')
  })
})
