import { describe, expect, it } from 'vitest'

import { API_URL } from './http'
import { resolveMediaUrl } from './media-url'

describe('resolveMediaUrl', () => {
  it('returns undefined for empty values', () => {
    expect(resolveMediaUrl(null)).toBeUndefined()
    expect(resolveMediaUrl(undefined)).toBeUndefined()
    expect(resolveMediaUrl('')).toBeUndefined()
  })

  it('resolves API-relative paths against the API base URL', () => {
    expect(resolveMediaUrl('/uploads/foto.jpg')).toBe(
      `${API_URL}/uploads/foto.jpg`
    )
  })

  it('normalizes relative paths without a leading slash', () => {
    expect(resolveMediaUrl('uploads/foto.jpg')).toBe(
      `${API_URL}/uploads/foto.jpg`
    )
  })

  it('keeps absolute URLs untouched', () => {
    expect(resolveMediaUrl('https://cdn.example.com/foto.jpg')).toBe(
      'https://cdn.example.com/foto.jpg'
    )
    expect(resolveMediaUrl('http://192.168.1.10:3000/uploads/foto.jpg')).toBe(
      'http://192.168.1.10:3000/uploads/foto.jpg'
    )
  })

  it('keeps browser-local URLs untouched', () => {
    expect(resolveMediaUrl('blob:http://localhost:5173/abc-123')).toBe(
      'blob:http://localhost:5173/abc-123'
    )
    expect(resolveMediaUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(
      'data:image/png;base64,iVBORw0KGgo='
    )
  })
})
