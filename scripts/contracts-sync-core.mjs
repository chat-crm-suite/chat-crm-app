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
