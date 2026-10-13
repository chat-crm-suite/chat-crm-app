/**
 * `pnpm contracts:sync` — downloads the contracts snapshot/version from the
 * backend endpoint and writes the local generated artifacts + lockfile.
 *
 * Usage:
 *   pnpm contracts:sync [--api-url URL] [--token TOKEN]
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

async function getJson(apiUrl, route, token) {
  const url = `${apiUrl.replace(/\/$/, '')}${route}`
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  const response = await fetch(url, { headers })

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
  const token = arg('token') || process.env.API_TOKEN || null

  if (!apiUrl || apiUrl === true) {
    console.error('Missing backend URL. Pass --api-url or set VITE_API_URL.')
    process.exit(2)
  }

  let version
  let snapshot
  try {
    version = await getJson(apiUrl, '/contracts/version', token)
    const manifest = await getJson(apiUrl, '/contracts/manifest', token)
    snapshot = await getJson(apiUrl, '/contracts/snapshot', token)
    version = { ...version, files: manifest.files }
  } catch (error) {
    console.error(`Could not reach the backend contracts endpoint (${apiUrl}).`)
    console.error(`  ${error.message}`)
    process.exit(2)
  }

  fs.mkdirSync(GENERATED_DIR, { recursive: true })
  fs.writeFileSync(
    path.join(GENERATED_DIR, 'contracts-snapshot.json'),
    `${JSON.stringify(snapshot, null, 2)}\n`,
    'utf8',
  )
  fs.writeFileSync(
    path.join(GENERATED_DIR, 'contracts-version.json'),
    `${JSON.stringify(version, null, 2)}\n`,
    'utf8',
  )

  const lock = {
    apiTag: version.tag,
    hash: version.hash,
    syncedAt: new Date().toISOString(),
    files: perFileHashes(version.files),
  }
  fs.writeFileSync(LOCK_PATH, `${JSON.stringify(lock, null, 2)}\n`, 'utf8')

  console.log(`Synced contracts from ${apiUrl} (${lock.apiTag}, hash ${lock.hash}).`)
}

void main()
