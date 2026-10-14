/** Side of the square avatar the API stores. */
export const AVATAR_SIZE = 256

type Source = { bitmap: CanvasImageSource; width: number; height: number; release: () => void }

async function decode(file: Blob): Promise<Source> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file)
    return {
      bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
    }
  }

  // Older browsers: decode through an <img>.
  const url = URL.createObjectURL(file)
  const image = new Image()
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('The image could not be read'))
    image.src = url
  })
  return {
    bitmap: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    release: () => URL.revokeObjectURL(url),
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality)
  )
}

/**
 * Center-crops an image to a square and scales it to `size` px as WebP (JPEG
 * on browsers that cannot encode WebP). Doing it here keeps uploads far below
 * the 2 MB limit and strips camera metadata such as GPS before it leaves the
 * device.
 */
export async function resizeAvatar(
  file: Blob,
  size: number = AVATAR_SIZE
): Promise<Blob> {
  const source = await decode(file)

  try {
    const side = Math.min(source.width, source.height)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas is not available')

    context.imageSmoothingQuality = 'high'
    context.drawImage(
      source.bitmap,
      (source.width - side) / 2,
      (source.height - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size
    )

    const webp = await toBlob(canvas, 'image/webp', 0.85)
    if (webp && webp.type === 'image/webp') return webp

    const jpeg = await toBlob(canvas, 'image/jpeg', 0.88)
    if (!jpeg) throw new Error('The image could not be encoded')
    return jpeg
  } finally {
    source.release()
  }
}
