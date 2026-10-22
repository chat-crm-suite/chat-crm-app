import { describe, expect, it } from 'vitest'
import { markReadInList, upsertNotifications } from './notification-cache'
import { makeNotification } from './testing'

describe('upsertNotifications', () => {
  const a = makeNotification({ id: 'a', updatedAt: '2026-10-20T10:00:00.000Z' })
  const b = makeNotification({ id: 'b', updatedAt: '2026-10-20T10:05:00.000Z' })

  it('is idempotent: the same event twice leaves one row', () => {
    expect(upsertNotifications(upsertNotifications([], [a]), [a])).toEqual([a])
  })

  it('orders by latest activity, so a grown group moves to the top', () => {
    const grown = { ...a, count: 2, updatedAt: '2026-10-20T10:10:00.000Z' }

    expect(
      upsertNotifications([b, a], [grown]).map((n) => [n.id, n.count])
    ).toEqual([
      ['a', 2],
      ['b', 1],
    ])
  })

  it('never lets a late, older copy overwrite a newer one', () => {
    const newer = { ...a, count: 3, updatedAt: '2026-10-20T11:00:00.000Z' }

    expect(upsertNotifications([newer], [a])[0].count).toBe(3)
  })
})

describe('markReadInList', () => {
  it('marks the given ids, or all, and keeps existing read dates', () => {
    const read = makeNotification({
      id: 'r',
      readAt: '2026-10-19T00:00:00.000Z',
    })
    const list = [
      makeNotification({ id: 'x' }),
      makeNotification({ id: 'y' }),
      read,
    ]

    const one = markReadInList(list, ['x'], 'now')
    expect(one.map((n) => n.readAt)).toEqual(['now', null, read.readAt])

    const all = markReadInList(list, 'all', 'now')
    expect(all.map((n) => n.readAt)).toEqual(['now', 'now', read.readAt])
  })
})
