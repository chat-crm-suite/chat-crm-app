import { describe, expect, it } from 'vitest'
import { formatClock, formatDuration } from './format'
import { recentMonths } from './months'
import { resourcesForScopes } from './query-keys'
import { slaStateFor } from './sla'
import { sufficiencyMessage } from './sufficiency'

describe('resourcesForScopes', () => {
  it('maps a spend event to the spend resource only', () => {
    expect(resourcesForScopes(['spend'])).toEqual(['spend'])
  })

  it('refreshes every resource a case change can move, and nothing else', () => {
    const resources = resourcesForScopes(['cases'])
    expect(resources).toEqual(
      expect.arrayContaining(['live', 'me', 'agents', 'volume', 'spend'])
    )
    expect(resources).not.toContain('sentiment')
    expect(resources).not.toContain('delivery')
  })
})

describe('slaStateFor', () => {
  it('turns amber from 80 % of the SLA and red at the SLA', () => {
    expect(slaStateFor(239, 300)).toBe('ok')
    expect(slaStateFor(240, 300)).toBe('risk')
    expect(slaStateFor(300, 300)).toBe('breach')
  })
})

describe('duration formatting', () => {
  it('reads like the floor talks', () => {
    expect(formatDuration(45)).toBe('45 s')
    expect(formatDuration(130)).toBe('2 min 10 s')
    expect(formatDuration(120)).toBe('2 min')
    expect(formatDuration(3900)).toBe('1 h 05 min')
    expect(formatDuration(null)).toBe('—')
  })

  it('formats live waits as a stopwatch', () => {
    expect(formatClock(432)).toBe('7:12')
    expect(formatClock(3725)).toBe('1:02:05')
  })
})

describe('sufficiencyMessage', () => {
  it('says how many more observations the method needs', () => {
    expect(
      sufficiencyMessage(
        { status: 'insufficient', sampleSize: 3, minimumSample: 8 },
        'days',
        'el gráfico de control'
      )
    ).toBe('Faltan 5 días de datos para el gráfico de control.')
  })

  it('is silent when there is enough data', () => {
    expect(
      sufficiencyMessage(
        { status: 'ok', sampleSize: 9, minimumSample: 8 },
        'days',
        'x'
      )
    ).toBeNull()
  })
})

describe('recentMonths', () => {
  it('lists the last months newest first across a year boundary', () => {
    expect(recentMonths(new Date(2026, 0, 15), 3)).toEqual([
      '2026-01',
      '2025-12',
      '2025-11',
    ])
  })
})
