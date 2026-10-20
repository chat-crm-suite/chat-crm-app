/**
 * Coordinates the open tabs of this browser so one notification makes one
 * sound and one OS notification, however many tabs are open.
 *
 * - A visible tab shows its toast and tells the others (`shown`).
 * - Hidden tabs wait a moment; if no visible tab took it, only the leader
 *   (the tab holding a Web Lock) shows the OS notification and plays the sound.
 *
 * Without BroadcastChannel / Web Locks (old browsers, tests) every tab acts
 * alone: the OS notification `tag` still collapses duplicates on screen.
 */
const CHANNEL = 'chat-crm-notifications'
const LEADER_LOCK = 'chat-crm-notifications-leader'
/** How long a hidden tab waits for a visible one to claim the event. */
export const HIDDEN_CLAIM_WAIT_MS = 400

type Message = { type: 'shown'; key: string }

export class TabCoordinator {
  private readonly channel: BroadcastChannel | null
  private readonly shown = new Set<string>()
  private leader = false
  private releaseLeader: (() => void) | null = null

  constructor() {
    this.channel =
      typeof BroadcastChannel === 'undefined'
        ? null
        : new BroadcastChannel(CHANNEL)
    this.channel?.addEventListener(
      'message',
      (event: MessageEvent<Message>) => {
        if (event.data?.type === 'shown') this.remember(event.data.key)
      }
    )

    if (typeof navigator !== 'undefined' && navigator.locks) {
      void navigator.locks.request(
        LEADER_LOCK,
        () =>
          new Promise<void>((resolve) => {
            this.leader = true
            this.releaseLeader = resolve
          })
      )
    } else {
      this.leader = true
    }
  }

  /** This (visible) tab presented the event: the others stand down. */
  claim(key: string): void {
    this.remember(key)
    this.channel?.postMessage({ type: 'shown', key } satisfies Message)
  }

  /**
   * Hidden tab: resolves `true` when it should present the event itself
   * (it is the leader and no visible tab claimed it meanwhile).
   */
  async shouldPresentHidden(
    key: string,
    waitMs = HIDDEN_CLAIM_WAIT_MS
  ): Promise<boolean> {
    if (!this.leader) return false
    await new Promise((resolve) => setTimeout(resolve, waitMs))
    if (this.shown.has(key)) return false

    this.claim(key)
    return true
  }

  dispose(): void {
    this.channel?.close()
    this.releaseLeader?.()
    this.releaseLeader = null
    this.leader = false
  }

  private remember(key: string): void {
    this.shown.add(key)
    // Bounded memory: keys only matter for a few hundred milliseconds.
    if (this.shown.size > 200) {
      const [first] = this.shown
      this.shown.delete(first)
    }
  }
}
