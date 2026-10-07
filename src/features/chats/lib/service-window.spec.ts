import { describe, expect, it } from 'vitest'
import type { ChatMessage } from '../types/chat.domain'
import {
  formatServiceWindowRemaining,
  serviceWindowState,
} from './service-window'

/** Fixed clock so the expected values come from the spec, not from `Date.now`. */
const NOW = new Date('2026-10-06T18:00:00')

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'm-1',
    conversationId: 'c-1',
    // 08:32 -> 14 h 32 min left at 18:00 (the prototype value).
    timestamp: new Date('2026-10-06T08:32:00'),
    status: 'read',
    sender: { id: 'customer-1', type: 'customer' },
    msg: { type: 'text', mediaUrl: null, content: { body: 'Hola' } },
    ...overrides,
  }
}

describe('serviceWindowState', () => {
  it('reports the remaining window from the last customer message', () => {
    const state = serviceWindowState([makeMessage()], NOW)

    expect(state).toEqual({
      kind: 'open',
      remainingMs: (14 * 60 + 32) * 60 * 1000,
    })
  })

  it('ignores agent messages when locating the last customer message', () => {
    const state = serviceWindowState(
      [
        makeMessage(),
        makeMessage({
          id: 'm-2',
          timestamp: new Date('2026-10-06T17:30:00'),
          sender: { id: 'member-1', type: 'member' },
        }),
      ],
      NOW
    )

    expect(state).toEqual({
      kind: 'open',
      remainingMs: (14 * 60 + 32) * 60 * 1000,
    })
  })

  it('takes the newest customer message, not the first one', () => {
    const state = serviceWindowState(
      [
        makeMessage({ id: 'm-1', timestamp: new Date('2026-10-06T08:00:00') }),
        makeMessage({ id: 'm-2', timestamp: new Date('2026-10-06T12:00:00') }),
      ],
      NOW
    )

    expect(state).toEqual({ kind: 'open', remainingMs: 18 * 60 * 60 * 1000 })
  })

  it('expires exactly 24 h after the last customer message', () => {
    const state = serviceWindowState(
      [makeMessage({ timestamp: new Date('2026-10-05T18:00:00') })],
      NOW
    )

    expect(state).toEqual({ kind: 'expired' })
  })

  it('stays expired after the window has passed', () => {
    const state = serviceWindowState(
      [makeMessage({ timestamp: new Date('2026-10-05T16:00:00') })],
      NOW
    )

    expect(state).toEqual({ kind: 'expired' })
  })

  it('reports no window when the customer has not written yet', () => {
    const state = serviceWindowState(
      [
        makeMessage({
          timestamp: new Date('2026-10-06T17:30:00'),
          sender: { id: 'member-1', type: 'member' },
        }),
        makeMessage({
          id: 'm-2',
          timestamp: new Date('2026-10-06T17:31:00'),
          sender: { id: 'system', type: 'system' },
        }),
      ],
      NOW
    )

    expect(state).toEqual({ kind: 'none' })
  })
})

describe('formatServiceWindowRemaining', () => {
  it('formats the remaining window as hours and minutes', () => {
    expect(formatServiceWindowRemaining((14 * 60 + 32) * 60 * 1000)).toBe(
      '14 h 32 min'
    )
  })

  it('formats less than an hour in minutes only', () => {
    expect(formatServiceWindowRemaining(45 * 60 * 1000)).toBe('45 min')
  })
})
