import { channelCapabilities } from '@chat-crm/contracts'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeSticker } from './sticker-maker'

const rules = channelCapabilities('whatsapp')!.sticker!
const bitmap = (width: number, height: number) => ({ width, height, close: vi.fn() })

afterEach(() => vi.unstubAllGlobals())

describe('makeSticker', () => {
  it('keeps a file that already is a valid sticker (it may be animated)', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap(512, 512)))
    const ready = new File(['webp'], 's.webp', { type: 'image/webp' })

    await expect(makeSticker(ready, rules)).resolves.toBe(ready)
  })

  it('fits any picture into a 512 square webp, lowering quality to fit', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap(1000, 500)))
    const drawImage = vi.fn()
    const sizes = [200 * 1024, 90 * 1024]
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as never)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (callback) {
      const size = sizes.shift() ?? 0
      callback(new File([new Uint8Array(size)], 'x', { type: 'image/webp' }))
    })

    const result = await makeSticker(new File(['png'], 'gato.png', { type: 'image/png' }), rules)

    // Fitted, centred: 512 x 256 at y = 128.
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 128, 512, 256)
    expect(result.name).toBe('gato.webp')
    expect(result.type).toBe('image/webp')
    expect(result.size).toBe(90 * 1024)
  })

  it('gives up with a clear reason when it cannot get under the cap', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap(512, 512)))
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as never)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) =>
      callback(new File([new Uint8Array(300 * 1024)], 'x', { type: 'image/webp' }))
    )

    await expect(
      makeSticker(new File(['png'], 'foto.png', { type: 'image/png' }), rules)
    ).rejects.toThrow('demasiado detalle')
  })
})
