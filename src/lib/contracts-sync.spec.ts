import { describe, expect, it } from 'vitest'

import { evaluateRuntimeSync } from './contracts-sync'

describe('evaluateRuntimeSync', () => {
  it('is in sync when both hashes match', () => {
    expect(evaluateRuntimeSync('abc', 'abc')).toBe('in-sync')
  })

  it('mismatches when the hashes differ', () => {
    expect(evaluateRuntimeSync('abc', 'xyz')).toBe('mismatch')
  })

  it('is unknown when either side is missing', () => {
    expect(evaluateRuntimeSync(null, 'abc')).toBe('unknown')
    expect(evaluateRuntimeSync('abc', null)).toBe('unknown')
    expect(evaluateRuntimeSync(undefined, undefined)).toBe('unknown')
    expect(evaluateRuntimeSync('', '')).toBe('unknown')
  })
})
