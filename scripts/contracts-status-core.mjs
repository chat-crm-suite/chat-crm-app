/**
 * Pure contracts-sync comparison + rendering.
 *
 * Shared by the `contracts:status` CLI (endpoint-only verification) and by the
 * app's dev-time runtime check. No I/O here: the CLI/runtime fetch the remote
 * data and hand plain objects over, so everything is unit-testable.
 *
 * Kept as `.mjs` + a hand-written `.d.mts` so both plain Node scripts and the
 * Vite/TS app can import it without a build step.
 */

/** @typedef {{ hash: string, version?: string|null, updatedAt?: string|null }} ContractFileMeta */
/** @typedef {{ apiTag: string, hash: string, syncedAt: string, files: Record<string,string> }} ContractsLock */
/** @typedef {{ tag: string, commit?: string, hash: string, generatedAt?: string, files: Record<string,ContractFileMeta> }} ContractsManifest */

export const CONTRACT_STATES = {
  IN_SYNC: 'IN_SYNC',
  OUT_OF_SYNC: 'OUT_OF_SYNC',
  UNCOMMITTED: 'UNCOMMITTED',
  MIXED: 'MIXED',
  NOT_INITIALIZED: 'NOT_INITIALIZED',
  UNVERIFIABLE: 'UNVERIFIABLE',
}

const LABELS = {
  IN_SYNC: 'IN SYNC',
  OUT_OF_SYNC: 'OUT OF SYNC',
  UNCOMMITTED: 'UNCOMMITTED CHANGES',
  MIXED: 'OUT OF SYNC + UNCOMMITTED CHANGES',
  NOT_INITIALIZED: 'NOT INITIALIZED',
  UNVERIFIABLE: 'UNVERIFIABLE',
}

const BADGES = {
  IN_SYNC: '[OK]',
  UNCOMMITTED: '[WARN]',
  OUT_OF_SYNC: '[FAIL]',
  MIXED: '[FAIL]',
  NOT_INITIALIZED: '[FAIL]',
  UNVERIFIABLE: '[FAIL]',
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/** Formats an ISO timestamp as `DD-Mon HH:MM` (fixed, locale-independent). */
export function formatMoment(iso) {
  if (!iso || typeof iso !== 'string') return 'unknown'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'unknown'
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = MONTHS[date.getUTCMonth()]
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  return `${day}-${month} ${hours}:${minutes}`
}

/**
 * Compares the locked per-file hashes with the backend manifest.
 * @returns {{ name: string, kind: 'changed'|'added'|'removed', from: string|null, to: string|null, updatedAt: string|null }[]}
 */
export function diffContractFiles(lockFiles, manifestFiles) {
  const names = new Set([
    ...Object.keys(lockFiles ?? {}),
    ...Object.keys(manifestFiles ?? {}),
  ])

  const changes = []
  for (const name of [...names].sort()) {
    const from = lockFiles?.[name] ?? null
    const remote = manifestFiles?.[name] ?? null
    const to = remote?.hash ?? null

    if (from && to && from === to) continue

    changes.push({
      name,
      kind: from === null ? 'added' : to === null ? 'removed' : 'changed',
      from,
      to,
      updatedAt: remote?.updatedAt ?? null,
    })
  }

  return changes
}

/**
 * @param {{ lock: ContractsLock|null, manifest: ContractsManifest|null, uncommitted?: string[] }} input
 */
export function evaluateContractsStatus({ lock, manifest, uncommitted = [], detail = null }) {
  if (!lock) {
    return { state: CONTRACT_STATES.NOT_INITIALIZED, exitCode: 2, changes: [], uncommitted, detail }
  }

  if (!manifest) {
    return { state: CONTRACT_STATES.UNVERIFIABLE, exitCode: 2, changes: [], uncommitted, detail }
  }

  const outOfSync = lock.hash !== manifest.hash
  const dirty = uncommitted.length > 0

  const state = outOfSync && dirty
    ? CONTRACT_STATES.MIXED
    : outOfSync
      ? CONTRACT_STATES.OUT_OF_SYNC
      : dirty
        ? CONTRACT_STATES.UNCOMMITTED
        : CONTRACT_STATES.IN_SYNC

  return {
    state,
    exitCode: state === CONTRACT_STATES.IN_SYNC ? 0 : 1,
    changes: outOfSync ? diffContractFiles(lock.files, manifest.files) : [],
    uncommitted,
    lock,
    manifest,
  }
}

const MAX_ROWS = 5

function renderChanges(changes, verbose) {
  const rows = verbose ? changes : changes.slice(0, MAX_ROWS)
  const lines = rows.map((change) => {
    if (change.kind === 'added') {
      return `    ${change.name.padEnd(18)} (new)              ${formatMoment(change.updatedAt)}`
    }
    if (change.kind === 'removed') {
      return `    ${change.name.padEnd(18)} (removed)          ${formatMoment(change.updatedAt)}`
    }
    return `    ${change.name.padEnd(18)} changed            ${formatMoment(change.updatedAt)}`
  })

  if (!verbose && changes.length > MAX_ROWS) {
    lines.push(`    ... and ${changes.length - MAX_ROWS} more (use --verbose)`)
  }

  return lines.join('\n')
}

/**
 * Renders the human, ASCII-only report. `uses` (optional) maps a contract name
 * to how many front files reference it, purely informational.
 */
export function renderContractsStatus(result, options = {}) {
  const { verbose = false, uses = {} } = options
  const badge = BADGES[result.state]
  const label = LABELS[result.state]

  if (result.state === CONTRACT_STATES.IN_SYNC) {
    const tag = result.lock?.apiTag ?? result.manifest?.tag ?? '?'
    const at = formatMoment(result.manifest?.generatedAt)
    return `${badge} Contracts ${label} (${tag}, ${at})`
  }

  if (result.state === CONTRACT_STATES.NOT_INITIALIZED) {
    return `${badge} Contracts ${label}\n\n  No contracts.lock.json found.\n  Next:  pnpm contracts:pull --api-url <url>`
  }

  if (result.state === CONTRACT_STATES.UNVERIFIABLE) {
    const reason = result.detail ? `\n  Reason: ${result.detail}` : ''
    return `${badge} Contracts ${label}\n\n  Could not reach the backend contracts endpoint.${reason}\n  Next:  check the API URL / VPN / credentials, then retry`
  }

  const lines = [`${badge} Contracts ${label}`, '']
  lines.push(`  yours:   ${result.lock.apiTag} (synced ${formatMoment(result.lock.syncedAt)})`)
  lines.push(`  backend: ${result.manifest.tag} (${formatMoment(result.manifest.generatedAt)})`)

  if (result.changes.length > 0) {
    lines.push('')
    lines.push(`  Changed contracts (${result.changes.length}):`)
    lines.push('')
    lines.push(renderChanges(result.changes, verbose))
    if (verbose && Object.keys(uses).length > 0) {
      lines.push('')
      lines.push('  Used in front:')
      for (const change of result.changes) {
        lines.push(`    ${change.name.padEnd(18)} ${uses[change.name] ?? 0} file(s)`)
      }
    }
  }

  if (result.uncommitted.length > 0) {
    lines.push('')
    lines.push(`  Uncommitted generated files (${result.uncommitted.length}):`)
    lines.push('')
    for (const file of result.uncommitted) {
      lines.push(`    ${file}`)
    }
  }

  lines.push('')
  if (result.state === CONTRACT_STATES.MIXED) {
    lines.push('  Next:  pnpm contracts:pull --api-url <url>   (sync first)')
    lines.push('         git add src/generated contracts.lock.json && git commit')
  } else if (result.state === CONTRACT_STATES.OUT_OF_SYNC) {
    lines.push('  Next:  pnpm contracts:pull --api-url <url>   (sync)')
    lines.push('         npx tsc -b                            (confirm exact lines)')
  } else if (result.state === CONTRACT_STATES.UNCOMMITTED) {
    lines.push('  Next:  git add src/generated contracts.lock.json && git commit')
  }

  return lines.join('\n')
}
