import type { ChannelCapabilities } from '@chat-crm/contracts'
import { readImageSize } from './attachment-candidate'

const QUALITIES = [0.92, 0.85, 0.75, 0.65, 0.5, 0.35]

/** Whether the browser can encode WebP (Chromium and Firefox; not Safari). */
export function canEncodeWebp(): boolean {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL('image/webp').startsWith('data:image/webp')
  } catch {
    return false
  }
}

type StickerRules = NonNullable<ChannelCapabilities['sticker']>

/** A ready WhatsApp sticker: square WebP of the exact size, small enough. */
async function isReadySticker(file: File, rules: StickerRules): Promise<boolean> {
  if (file.type !== 'image/webp' || file.size > rules.maxStaticBytes) return false
  const size = await readImageSize(file)
  return size?.width === rules.width && size.height === rules.height
}

/**
 * Turns any picture into a sticker the channel accepts: fitted (not cropped)
 * into a transparent square of the required size and encoded as WebP, with
 * the quality lowered until it fits the size cap. A file that already is a
 * valid sticker is kept untouched (it may be animated).
 */
export async function makeSticker(file: File, rules: StickerRules): Promise<File> {
  if (await isReadySticker(file, rules)) return file

  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = rules.width
  canvas.height = rules.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('El navegador no puede dibujar la imagen.')

  const scale = Math.min(rules.width / bitmap.width, rules.height / bitmap.height)
  const width = bitmap.width * scale
  const height = bitmap.height * scale
  context.drawImage(bitmap, (rules.width - width) / 2, (rules.height - height) / 2, width, height)
  bitmap.close()

  for (const quality of QUALITIES) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', quality)
    )
    if (blob && blob.type === 'image/webp' && blob.size <= rules.maxStaticBytes) {
      const name = file.name.replace(/\.[^.]*$/, '') || 'sticker'
      return new File([blob], `${name}.webp`, { type: 'image/webp' })
    }
  }

  throw new Error('La imagen tiene demasiado detalle para un sticker de 100 KB.')
}
