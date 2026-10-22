/**
 * Pure helpers for `contracts:pull` (no I/O decisions beyond a single file
 * write). Extracted so the idempotency rule is unit-testable.
 */
import fs from 'node:fs'
import path from 'node:path'

/** Stable fingerprint of a lock, ignoring the volatile `syncedAt`. */
export function lockFingerprint(lock) {
  const files = Object.fromEntries(
    Object.entries(lock?.files ?? {}).sort(([a], [b]) => a.localeCompare(b)),
  )
  return JSON.stringify({ apiTag: lock?.apiTag, hash: lock?.hash, files })
}

/**
 * True when a repeated pull would change nothing: the lock already carries the
 * same tag/hash/files (a fresh `syncedAt` alone must NOT count as a change).
 */
export function shouldSkipSync(existingLock, nextLock) {
  if (!existingLock) return false
  return lockFingerprint(existingLock) === lockFingerprint(nextLock)
}

/** Writes only when the content actually changes; returns whether it wrote. */
export function writeIfChanged(filePath, content) {
  let current = null
  try {
    current = fs.readFileSync(filePath, 'utf8')
  } catch {
    current = null
  }
  if (current === content) return false

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content, 'utf8')
  return true
}

/** Paths `contracts:pull` writes; the auto-commit touches only these. */
export const SYNC_PATHS = ['contracts.lock.json', 'src/generated']

/** Contract files whose hash differs between two locks (added, removed or changed). */
export function changedContractFiles(previousLock, nextLock) {
  const before = previousLock?.files ?? {}
  const after = nextLock?.files ?? {}
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((name) => before[name] !== after[name])
    .sort((a, b) => a.localeCompare(b))
}

/** Conventional commit (gitmoji) for a sync; the body lists the changed contracts. */
export function buildSyncCommitMessage(previousLock, nextLock) {
  const subject = `chore(contracts): 🔧 sync contracts lock to ${nextLock.apiTag} (${String(nextLock.hash).slice(0, 8)})`
  const changed = changedContractFiles(previousLock, nextLock)
  if (changed.length === 0) return subject
  return `${subject}\n\nChanged contracts: ${changed.join(', ')}.`
}

/**
 * Why the auto-commit must NOT run, or null when it may. `main` only takes the
 * release merge and hotfixes, so a sync never lands there directly.
 */
export function autoCommitBlocker({ disabled, insideWorkTree, branch, dirtyPaths }) {
  if (disabled) return 'auto-commit disabled (--no-commit)'
  if (!insideWorkTree) return 'not a git work tree'
  if (dirtyPaths.length === 0) return 'nothing to commit'
  if (!branch) return 'detached HEAD'
  if (branch === 'main') return 'on main (sync on develop or a feature branch instead)'
  return null
}
