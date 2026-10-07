import { describe, expect, it } from 'vitest'

import { customerInitials, tintIndex } from './monogram'

describe('customerInitials', () => {
  it('takes the first letter of the first two words', () => {
    expect(customerInitials({ displayName: 'María González' })).toBe('MG')
    expect(customerInitials({ displayName: 'Ana María López' })).toBe('AM')
  })

  it('uses the first two letters of a single word', () => {
    expect(customerInitials({ displayName: 'Rosa' })).toBe('RO')
  })

  it('falls back to the phone last two digits and finally a placeholder', () => {
    expect(customerInitials({ displayName: null, phone: '+51 987 654 321' })).toBe(
      '21'
    )
    expect(customerInitials({})).toBe('?')
  })
})

describe('tintIndex', () => {
  it('is deterministic and bounded', () => {
    const first = tintIndex('María González')

    expect(tintIndex('María González')).toBe(first)
    expect(first).toBeGreaterThanOrEqual(0)
    expect(first).toBeLessThan(8)
  })

  it('spreads different names across buckets', () => {
    const buckets = new Set(
      ['Ana López', 'Carlos Pérez', 'Luis Torres', 'Rosa Sánchez', 'Pedro Gómez'].map(
        tintIndex
      )
    )

    expect(buckets.size).toBeGreaterThan(1)
  })
})
