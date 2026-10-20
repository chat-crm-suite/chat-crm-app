/**
 * Dev-only runtime contracts check.
 *
 * The synced fingerprint is baked into the bundle at build time (Vite `define`
 * from `contracts.lock.json`). At startup in development we compare it with the
 * backend's `GET /contracts/version`: a mismatch shows a blocking banner so a
 * stale frontend is caught immediately. In production this is never called, so
 * a deployed frontend can never be "suicided" by a newer backend.
 */

import { API_URL } from './endpoints'

export type RuntimeSyncState = 'in-sync' | 'mismatch' | 'unknown'

/** Pure comparison, unit-tested without any network. */
export function evaluateRuntimeSync(
  embedded: string | null | undefined,
  remote: string | null | undefined,
): RuntimeSyncState {
  if (!embedded || !remote) return 'unknown'
  return embedded === remote ? 'in-sync' : 'mismatch'
}

const BANNER_ID = 'contracts-sync-banner'

function showBanner(message: string): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(BANNER_ID)) return

  const element = document.createElement('div')
  element.id = BANNER_ID
  element.setAttribute('role', 'alert')
  element.textContent = message
  element.style.cssText = [
    'position:fixed',
    'z-index:99999',
    'left:0',
    'right:0',
    'bottom:0',
    'padding:10px 14px',
    'font:13px/1.4 ui-monospace,monospace',
    'text-align:center',
    'background:#7f1d1d',
    'color:#fee2e2',
  ].join(';')

  document.body.appendChild(element)
}

export async function checkContractsSync(): Promise<RuntimeSyncState> {
  const embedded =
    typeof __CONTRACTS_LOCK_HASH__ === 'string' ? __CONTRACTS_LOCK_HASH__ : null

  try {
    const response = await fetch(`${API_URL}/contracts/version`, {
      credentials: 'include',
    })
    if (!response.ok) return 'unknown'

    const data = (await response.json()) as { hash?: string }
    const state = evaluateRuntimeSync(embedded, data?.hash ?? null)

    if (state === 'mismatch') {
      // eslint-disable-next-line no-console
      console.warn(
        `[contracts] front=${embedded} backend=${data?.hash}. Run \`pnpm contracts:status\`.`,
      )
      showBanner(
        'Contracts mismatch: frontend and backend contracts differ. Run `pnpm contracts:status`.',
      )
    }

    return state
  } catch {
    return 'unknown'
  }
}
