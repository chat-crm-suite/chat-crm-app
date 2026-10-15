import { describe, expect, it } from 'vitest'

import { animatedWebpLoopMs } from './animated-webp'

const chunk = (type: string, body: number[]) => {
  const size = body.length
  return [
    ...[...type].map((c) => c.charCodeAt(0)),
    size & 0xff,
    (size >> 8) & 0xff,
    (size >> 16) & 0xff,
    (size >> 24) & 0xff,
    ...body,
    ...(size & 1 ? [0] : []),
  ]
}

const webp = (flags: number, ...chunks: number[][]) => {
  const body = [
    ...'WEBP'.split('').map((c) => c.charCodeAt(0)),
    ...chunk('VP8X', [flags, 0, 0, 0, 255, 1, 0, 255, 1, 0]),
    ...chunks.flat(),
  ]
  return new Uint8Array([
    ...'RIFF'.split('').map((c) => c.charCodeAt(0)),
    ...[body.length, 0, 0, 0],
    ...body,
  ])
}

/** ANMF with a duration (ms) and a dummy one-byte payload (odd → padded). */
const frame = (ms: number) =>
  chunk('ANMF', [...Array(12).fill(0), ms & 0xff, (ms >> 8) & 0xff, 0, 0, 0xaa])

describe('animatedWebpLoopMs', () => {
  it('adds up the frame durations of an animated sticker', () => {
    expect(
      animatedWebpLoopMs(webp(0x02, chunk('ANIM', [0, 0, 0, 0, 0, 0]), frame(400), frame(600)))
    ).toBe(1000)
  })

  it('returns null for a still WebP and for other files', () => {
    expect(animatedWebpLoopMs(webp(0x00))).toBeNull()
    expect(animatedWebpLoopMs(new Uint8Array(64))).toBeNull()
  })
})
