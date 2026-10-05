import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyToClipboard } from './clipboard'

const setClipboard = (value: unknown) =>
  Object.defineProperty(navigator, 'clipboard', {
    value,
    configurable: true,
  })

describe('copyToClipboard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    setClipboard(undefined)
  })

  it('uses the async clipboard API in a secure context', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })

    await expect(copyToClipboard('https://x/webhook')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('https://x/webhook')
  })

  it('falls back to execCommand when navigator.clipboard is missing (plain HTTP)', async () => {
    setClipboard(undefined)
    let copied = ''
    document.execCommand = vi.fn(() => {
      copied = document.querySelector('textarea')?.value ?? ''
      return true
    })

    await expect(copyToClipboard('http://x/webhook')).resolves.toBe(true)
    expect(document.execCommand).toHaveBeenCalledWith('copy')
    expect(copied).toBe('http://x/webhook')
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('falls back when the async API rejects', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) })
    document.execCommand = vi.fn(() => true)

    await expect(copyToClipboard('abc')).resolves.toBe(true)
    expect(document.execCommand).toHaveBeenCalledWith('copy')
  })

  it('reports failure when nothing could be copied', async () => {
    setClipboard(undefined)
    document.execCommand = vi.fn(() => false)

    await expect(copyToClipboard('abc')).resolves.toBe(false)
  })
})
