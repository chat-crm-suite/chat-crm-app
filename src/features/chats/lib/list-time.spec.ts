import { describe, expect, it } from 'vitest'

import {
  formatRelativeTime,
  formatWaitingTime,
  urgencyTier,
} from './list-time'

const NOW = new Date('2026-10-07T15:00:00').getTime()
const minutesAgo = (minutes: number) => new Date(NOW - minutes * 60_000)

describe('urgencyTier', () => {
  it.each([
    [0, 'quiet'],
    [14, 'quiet'],
    [15, 'normal'],
    [29, 'normal'],
    [30, 'warning'],
    [59, 'warning'],
    [60, 'critical'],
    [240, 'critical'],
  ] as const)('maps %i minutes of age to %s', (minutes, tier) => {
    expect(urgencyTier(minutesAgo(minutes), NOW)).toBe(tier)
  })
})

describe('formatRelativeTime', () => {
  it('shows compact minutes and hours', () => {
    expect(formatRelativeTime(minutesAgo(0), NOW)).toBe('ahora')
    expect(formatRelativeTime(minutesAgo(5), NOW)).toBe('5m')
    expect(formatRelativeTime(minutesAgo(2 * 60), NOW)).toBe('2h')
  })

  it('names yesterday and earlier weekdays', () => {
    expect(formatRelativeTime(new Date('2026-10-06T15:00:00').getTime(), NOW)).toBe(
      'ayer'
    )
    // 2026-10-05 is a Monday.
    expect(formatRelativeTime(new Date('2026-10-05T10:00:00').getTime(), NOW)).toBe(
      'lun'
    )
  })

  it('falls back to d/M beyond a week', () => {
    expect(
      formatRelativeTime(new Date('2026-09-28T10:00:00').getTime(), NOW)
    ).toBe('28/9')
  })
})

describe('formatWaitingTime', () => {
  it('always names the wait with compact units', () => {
    expect(formatWaitingTime(minutesAgo(0.5), NOW)).toBe('espera 1m')
    expect(formatWaitingTime(minutesAgo(40), NOW)).toBe('espera 40m')
    expect(formatWaitingTime(minutesAgo(2 * 60 + 10), NOW)).toBe('espera 2h')
    expect(formatWaitingTime(minutesAgo(3 * 24 * 60), NOW)).toBe('espera 3d')
  })
})
