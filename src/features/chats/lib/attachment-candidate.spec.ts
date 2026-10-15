import { channelCapabilities } from '@chat-crm/contracts'
import { describe, expect, it } from 'vitest'
import { acceptFor, classifyFile } from './attachment-candidate'

const whatsapp = channelCapabilities('whatsapp')
const file = (name: string, type: string, size = 1024) => {
  const blob = new File(['x'], name, { type })
  Object.defineProperty(blob, 'size', { value: size })
  return blob
}

describe('classifyFile', () => {
  it('sends photos and videos as media, the rest as documents or audio', () => {
    expect(classifyFile(file('a.jpg', 'image/jpeg'), whatsapp)).toEqual({ ok: true, kind: 'image' })
    expect(classifyFile(file('a.mp4', 'video/mp4'), whatsapp)).toEqual({ ok: true, kind: 'video' })
    expect(classifyFile(file('a.mp3', 'audio/mpeg'), whatsapp)).toEqual({ ok: true, kind: 'audio' })
    expect(classifyFile(file('a.pdf', 'application/pdf'), whatsapp)).toEqual({
      ok: true,
      kind: 'document',
    })
  })

  it('explains a size over the channel limit', () => {
    expect(classifyFile(file('big.mp4', 'video/mp4', 20 * 1024 * 1024), whatsapp)).toEqual({
      ok: false,
      reason: 'El video «big.mp4» supera 16 MB.',
    })
  })

  it('explains a type the channel cannot send', () => {
    const result = classifyFile(file('a.exe', 'application/x-msdownload'), whatsapp)
    expect(result).toMatchObject({ ok: false })
    expect(!result.ok && result.reason).toContain('no se puede enviar')
  })

  it('honours the menu the agent picked', () => {
    expect(classifyFile(file('a.png', 'image/png'), whatsapp, 'document')).toMatchObject({
      ok: false,
    })
    expect(classifyFile(file('a.pdf', 'application/pdf'), whatsapp, 'media')).toMatchObject({
      ok: false,
      reason: expect.stringContaining('foto o video') as string,
    })
  })

  it('refuses every file on channels without capabilities', () => {
    expect(classifyFile(file('a.jpg', 'image/jpeg'), null)).toMatchObject({ ok: false })
  })
})

describe('acceptFor', () => {
  it('lists the media types a file input should offer', () => {
    expect(acceptFor(whatsapp, 'media')).toBe('image/jpeg,image/png,video/mp4,video/3gpp')
    expect(acceptFor(whatsapp, 'document')).toContain('application/pdf')
  })
})
