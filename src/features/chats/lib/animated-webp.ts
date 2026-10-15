const ANIMATION_FLAG = 0x02

const fourCC = (bytes: Uint8Array, offset: number) =>
  String.fromCharCode(...bytes.subarray(offset, offset + 4))

const uint24 = (bytes: Uint8Array, offset: number) =>
  bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16)

/**
 * Length of one loop of an animated WebP in ms (sum of its `ANMF` frame
 * durations), or `null` for a still image or anything that is not a WebP.
 */
export function animatedWebpLoopMs(bytes: Uint8Array): number | null {
  if (bytes.length < 30) return null
  if (fourCC(bytes, 0) !== 'RIFF' || fourCC(bytes, 8) !== 'WEBP') return null
  if (fourCC(bytes, 12) !== 'VP8X' || !(bytes[20] & ANIMATION_FLAG)) return null

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let total = 0
  let frames = 0
  let offset = 12

  while (offset + 8 <= bytes.length) {
    const size = view.getUint32(offset + 4, true)
    if (fourCC(bytes, offset) === 'ANMF' && offset + 8 + 15 <= bytes.length) {
      // Frame header: X, Y, width-1, height-1 (3 bytes each), then duration.
      total += uint24(bytes, offset + 8 + 12)
      frames += 1
    }
    // Chunks are padded to an even size.
    offset += 8 + size + (size & 1)
  }

  // Browsers play 0 ms frames at ~100 ms; mirror that so the loop isn't cut.
  return frames ? Math.max(total, frames * 10, 100) : null
}
