import { describe, expect, it } from 'vitest'
import { formatPhone } from './identity'

describe('formatPhone', () => {
  it('formats a valid Peruvian number in international format', () => {
    expect(formatPhone('+51987654321')).toBe('+51 987 654 321')
  })

  it('formats a local Peruvian number with the PE default country', () => {
    expect(formatPhone('987654321')).toBe('+51 987 654 321')
  })

  it('passes invalid or partial input through untouched', () => {
    expect(formatPhone('123')).toBe('123')
    expect(formatPhone('abc')).toBe('abc')
  })

  it('returns undefined for a missing phone', () => {
    expect(formatPhone(undefined)).toBeUndefined()
    expect(formatPhone(null)).toBeUndefined()
    expect(formatPhone('')).toBeUndefined()
  })
})
