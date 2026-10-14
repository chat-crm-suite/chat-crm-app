/**
 * `pnpm contracts:pull` — downloads the contracts snapshot/version from the
 * backend endpoint and writes the local generated artifacts + lockfile.
 *
 * Usage:
 *   pnpm contracts:pull [--api-url URL] [-u USER] [-p PASS]
 *
 * Credentials are flags (-u/-p) → env (API_USERNAME/API_PASSWORD) → prompt, and
 * live only in memory for this run.
 *
 * Writes:
 *   src/generated/contracts-snapshot.json   (full snapshot, for reference/diff)
 *   src/generated/contracts-version.json    (tag/commit/hash/generatedAt/files)
 *   contracts.lock.json                     ({ apiTag, hash, syncedAt, files })
 *
 * Nothing here inspects a sibling checkout: the backend endpoint is the only
 * source, so the same command works in dev and prod.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { authenticatedFetch, obtainSessionCookie } from './contracts-auth.mjs'
import { shouldSkipSync, writeIfChanged } from './contracts-sync-core.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const GENERATED_DIR = path.join(REPO_ROOT, 'src', 'generated')
const LOCK_PATH = path.join(REPO_ROOT, 'contracts.lock.json')

function arg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1) return fallback
  const value = process.argv[index + 1]
  return value && !value.startsWith('--') ? value : true
}

function readViteApiUrl() {
  const envPath = path.join(REPO_ROOT, '.env')
  if (!fs.existsSync(envPath)) return null
  const match = fs.readFileSync(envPath, 'utf8').match(/^VITE_API_URL=(.+)$/m)
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null
}

async function getJson(apiUrl, route, cookie) {
  const response = await authenticatedFetch(apiUrl, route, cookie)
  if (!response.ok) {
    throw new Error(`${route} -> HTTP ${response.status}`)
  }
  return response.json()
}

function perFileHashes(files = {}) {
  const map = {}
  for (const [name, meta] of Object.entries(files)) {
    map[name] = meta && typeof meta === 'object' ? meta.hash : meta
  }
  return map
}

/** Stable fingerprint of a lock, ignoring the volatile `syncedAt`. */
function readLock() {
  try {
    return JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'))
  } catch {
    return null
  }
}

async function main() {
  const apiUrl = arg('api-url') || process.env.VITE_API_URL || readViteApiUrl()

  if (!apiUrl || apiUrl === true) {
    console.error('Missing backend URL. Pass --api-url or set VITE_API_URL.')
    process.exit(2)
  }

  let version
  let manifest
  let snapshot
  try {
    const cookie = await obtainSessionCookie({ apiUrl })
    version = await getJson(apiUrl, '/contracts/version', cookie)
    manifest = await getJson(apiUrl, '/contracts/manifest', cookie)
    snapshot = await getJson(apiUrl, '/contracts/snapshot', cookie)
  } catch (error) {
    console.error(`Could not fetch contracts from the backend (${apiUrl}).`)
    console.error(`  ${error.message}`)
    process.exit(2)
  }

  const mergedVersion = { ...version, files: manifest.files }
  const snapshotContent = `${JSON.stringify(snapshot, null, 2)}\n`
  const versionContent = `${JSON.stringify(mergedVersion, null, 2)}\n`
  const snapshotPath = path.join(GENERATED_DIR, 'contracts-snapshot.json')
  const versionPath = path.join(GENERATED_DIR, 'contracts-version.json')

  const nextLock = {
    apiTag: version.tag,
    hash: version.hash,
    files: perFileHashes(manifest.files),
  }

  // Idempotent: if the lock already matches, do not touch `syncedAt` (or any
  // file) so a repeated pull leaves the working tree clean. Only re-materialize
  // the generated files when they are missing or differ.
  const existing = readLock()
  if (shouldSkipSync(existing, nextLock)) {
    const wroteSnapshot = writeIfChanged(snapshotPath, snapshotContent)
    const wroteVersion = writeIfChanged(versionPath, versionContent)

    console.log(
      wroteSnapshot || wroteVersion
        ? `Re-materialized generated contracts (${nextLock.apiTag}, hash ${nextLock.hash}).`
        : `Contracts already up to date (${nextLock.apiTag}, hash ${nextLock.hash}); nothing changed.`,
    )
    return
  }

  writeIfChanged(snapshotPath, snapshotContent)
  writeIfChanged(versionPath, versionContent)

  const lock = { ...nextLock, syncedAt: new Date().toISOString() }
  fs.writeFileSync(LOCK_PATH, `${JSON.stringify(lock, null, 2)}\n`, 'utf8')

  console.log(`Synced contracts from ${apiUrl} (${lock.apiTag}, hash ${lock.hash}).`)
}

void main()
