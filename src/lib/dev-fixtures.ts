/**
 * Explicit, development-only switch to render the inbox v2 screens from the
 * contract fixtures (`features/<feature>/__fixtures__`) while the API
 * endpoints do not exist yet. Turn it on with
 * `localStorage.setItem('dev:fixtures', '1')` (or `VITE_DEV_FIXTURES=1`) and
 * reload. Production builds never read fixtures: the branch is dead code
 * there and the fixture modules are only loaded through dynamic imports.
 */
export function devFixturesEnabled(): boolean {
  if (!import.meta.env.DEV) return false
  if (import.meta.env.VITE_DEV_FIXTURES === '1') return true
  try {
    return globalThis.localStorage?.getItem('dev:fixtures') === '1'
  } catch {
    return false
  }
}

/**
 * Read through the fixture when the dev switch is on, otherwise through the
 * real request. Only used by read endpoints; mutations always hit the API.
 */
export async function withDevFixture<T>(
  fixture: () => Promise<T>,
  request: () => Promise<T>
): Promise<T> {
  return devFixturesEnabled() ? fixture() : request()
}
