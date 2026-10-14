import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_LOCAL_NOTIFICATION_PREFS,
  LOCAL_NOTIFICATION_PREFS_KEY,
  readLocalNotificationPrefs,
  shouldShowDesktopNotification,
  writeLocalNotificationPrefs,
} from './local-notification-prefs'

beforeEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe('local notification prefs', () => {
  it('defaults to sound and desktop alerts on', () => {
    expect(readLocalNotificationPrefs()).toEqual(DEFAULT_LOCAL_NOTIFICATION_PREFS)
  })

  it('round-trips what was written', () => {
    writeLocalNotificationPrefs({ sound: false, desktop: true })
    expect(readLocalNotificationPrefs()).toEqual({ sound: false, desktop: true })
  })

  it('ignores corrupt or partial storage', () => {
    window.localStorage.setItem(LOCAL_NOTIFICATION_PREFS_KEY, '{nope')
    expect(readLocalNotificationPrefs()).toEqual(DEFAULT_LOCAL_NOTIFICATION_PREFS)

    window.localStorage.setItem(
      LOCAL_NOTIFICATION_PREFS_KEY,
      JSON.stringify({ sound: 'yes' })
    )
    expect(readLocalNotificationPrefs()).toEqual(DEFAULT_LOCAL_NOTIFICATION_PREFS)
  })

  it('survives blocked storage on read and write', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    expect(readLocalNotificationPrefs()).toEqual(DEFAULT_LOCAL_NOTIFICATION_PREFS)
    expect(() =>
      writeLocalNotificationPrefs({ sound: false, desktop: false })
    ).not.toThrow()
  })

  it('shows desktop alerts only with the choice on and the browser permission granted', () => {
    vi.stubGlobal('Notification', { permission: 'granted' })
    expect(shouldShowDesktopNotification()).toBe(true)

    writeLocalNotificationPrefs({ sound: true, desktop: false })
    expect(shouldShowDesktopNotification()).toBe(false)

    writeLocalNotificationPrefs({ sound: true, desktop: true })
    vi.stubGlobal('Notification', { permission: 'denied' })
    expect(shouldShowDesktopNotification()).toBe(false)

    vi.stubGlobal('Notification', undefined)
    expect(shouldShowDesktopNotification()).toBe(false)
  })
})
