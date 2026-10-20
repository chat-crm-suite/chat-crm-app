import { afterEach, describe, expect, it } from 'vitest'
import { TabCoordinator } from './tab-coordinator'

describe('TabCoordinator', () => {
  const tabs: TabCoordinator[] = []
  const open = () => {
    const tab = new TabCoordinator()
    tabs.push(tab)
    return tab
  }

  afterEach(() => {
    tabs.splice(0).forEach((tab) => tab.dispose())
  })

  it('a hidden leader presents what no visible tab claimed', async () => {
    await expect(open().shouldPresentHidden('n1:v1', 0)).resolves.toBe(true)
  })

  it('stands down when the event was already presented', async () => {
    const tab = open()
    tab.claim('n1:v1')

    await expect(tab.shouldPresentHidden('n1:v1', 0)).resolves.toBe(false)
  })

  it('stands down when another tab claimed it over the channel', async () => {
    const visible = open()
    const hidden = open()

    visible.claim('n2:v1')

    await expect(hidden.shouldPresentHidden('n2:v1', 50)).resolves.toBe(false)
  })
})
