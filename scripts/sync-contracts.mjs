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

  fs.mkdirSync(GENERATED_DIR, { recursive: true })
  fs.writeFileSync(
    path.join(GENERATED_DIR, 'contracts-snapshot.json'),
    `${JSON.stringify(snapshot, null, 2)}\n`,
    'utf8',
  )
  fs.writeFileSync(
    path.join(GENERATED_DIR, 'contracts-version.json'),
    `${JSON.stringify(mergedVersion, null, 2)}\n`,
    'utf8',
  )

  const lock = {
    apiTag: version.tag,
    hash: version.hash,
    syncedAt: new Date().toISOString(),
    files: perFileHashes(manifest.files),
  }
  fs.writeFileSync(LOCK_PATH, `${JSON.stringify(lock, null, 2)}\n`, 'utf8')

  console.log(`Synced contracts from ${apiUrl} (${lock.apiTag}, hash ${lock.hash}).`)
}

void main()
