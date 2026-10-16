import { z } from 'zod'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseContract } from './contract-parse'

const Schema = z.object({ at: z.coerce.date(), n: z.number() })

describe('parseContract', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('coerces wire dates into Date in production builds', () => {
    vi.stubEnv('DEV', false)

    const parsed = parseContract(Schema, {
      at: '2026-10-16T04:00:00.000Z',
      n: 1,
    })

    expect(parsed.at).toBeInstanceOf(Date)
    expect(parsed.at.getTime()).toBe(Date.parse('2026-10-16T04:00:00.000Z'))
  })

  it('throws on a contract drift in development', () => {
    vi.stubEnv('DEV', true)

    expect(() => parseContract(Schema, { at: 'x', n: 'no' })).toThrow()
  })

  it('returns a drifted payload as-is in production, with a warning', () => {
    vi.stubEnv('DEV', false)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const raw = { at: '2026-10-16T04:00:00.000Z', n: 'no' }

    expect(parseContract(Schema, raw)).toBe(raw)
    expect(warn).toHaveBeenCalledTimes(1)
  })
})
