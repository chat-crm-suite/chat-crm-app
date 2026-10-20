import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { showDesktopNotification } from './desktop-notifier'
import { makeNotification } from './testing'

class MockNotification {
  static permission: NotificationPermission = 'granted'
  static instances: MockNotification[] = []
  onclick: (() => void) | null = null
  close = vi.fn()

  title: string
  options: NotificationOptions & { renotify?: boolean }

  constructor(
    title: string,
    options: NotificationOptions & { renotify?: boolean }
  ) {
    this.title = title
    this.options = options
    MockNotification.instances.push(this)
  }
}

describe('showDesktopNotification', () => {
  beforeEach(() => {
    MockNotification.permission = 'granted'
    MockNotification.instances = []
    vi.stubGlobal('Notification', MockNotification)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('groups by tag, shows the count and re-alerts a grown group', () => {
    showDesktopNotification(
      makeNotification({
        groupKey: 'conversation:conv-1',
        count: 3,
        title: 'Ana',
      }),
      vi.fn()
    )

    expect(MockNotification.instances[0]).toMatchObject({
      title: 'Ana (3)',
      options: {
        tag: 'conversation:conv-1',
        renotify: true,
        body: 'Ana espera tu respuesta',
      },
    })
  })

  it('opens the target and closes itself on click', () => {
    const open = vi.fn()
    const focus = vi.spyOn(window, 'focus').mockImplementation(() => undefined)
    showDesktopNotification(makeNotification(), open)

    const [shown] = MockNotification.instances
    shown.onclick?.()

    expect(focus).toHaveBeenCalled()
    expect(open).toHaveBeenCalledTimes(1)
    expect(shown.close).toHaveBeenCalled()
  })

  it('does nothing without the permission', () => {
    MockNotification.permission = 'default'

    expect(showDesktopNotification(makeNotification(), vi.fn())).toBeNull()
    expect(MockNotification.instances).toHaveLength(0)
  })
})
