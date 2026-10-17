/**
 * `pnpm contracts:pull` — downloads the contracts snapshot/version from the
 * backend endpoint and writes the local generated artifacts + lockfile.
 *
 * Usage:
 *   pnpm contracts:pull [--api-url URL] [-u USER] [-p PASS] [--no-commit]
 *
 * Credentials are flags (-u/-p) → env (API_USERNAME/API_PASSWORD) → prompt, and
 * live only in memory for this run.
 *
 * Writes:
 *   src/generated/contracts-snapshot.json   (full snapshot, for reference/diff)
 *   src/generated/contracts-version.json    (tag/commit/hash/generatedAt/files)
 *   contracts.lock.json                     ({ apiTag, hash, syncedAt, files })
 *
 * Then, when those paths changed, it commits ONLY them (other staged work is left
 * alone) as `chore(contracts): 🔧 sync contracts lock to <tag> (<hash>)`. It never
 * pushes, and skips the commit on `main`, on a detached HEAD or with `--no-commit`.
 *
 * Nothing here inspects a sibling checkout: the backend endpoint is the only
 * source, so the same command works in dev and prod.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { authenticatedFetch, obtainSessionCookie } from './contracts-auth.mjs'
import {
  SYNC_PATHS,
  autoCommitBlocker,
  buildSyncCommitMessage,
  shouldSkipSync,
  writeIfChanged,
} from './contracts-sync-core.mjs'

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

function git(args) {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function tryGit(args) {
  try {
    return git(args)
  } catch {
    return null
  }
}

/** Commits the synced paths when they changed; see the header for the rules. */
function autoCommit(previousLock, nextLock) {
  const insideWorkTree = tryGit(['rev-parse', '--is-inside-work-tree']) === 'true'
  const blocker = autoCommitBlocker({
    disabled: process.argv.includes('--no-commit'),
    insideWorkTree,
    branch: insideWorkTree ? (tryGit(['branch', '--show-current']) ?? '') : '',
    dirtyPaths: insideWorkTree
      ? (tryGit(['status', '--porcelain', '--', ...SYNC_PATHS]) ?? '').split('\n').filter(Boolean)
      : [],
  })
  if (blocker) {
    if (blocker !== 'nothing to commit') console.log(`Not committing: ${blocker}.`)
    return
  }

  try {
    git(['add', '--', ...SYNC_PATHS])
    // Pathspec commit: only the synced paths go in, even if other work is staged.
    git(['commit', '-m', buildSyncCommitMessage(previousLock, nextLock), '--', ...SYNC_PATHS])
    const branch = git(['branch', '--show-current'])
    console.log(`Committed ${git(['log', '-1', '--format=%h %s'])}`)
    console.log(`Push when ready: git push origin ${branch} && git push codecta ${branch}`)
  } catch (error) {
    console.error('Synced, but the auto-commit failed; commit the files by hand.')
    console.error(`  ${String(error.stderr || error.message).trim()}`)
    process.exitCode = 1
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
    // Also picks up files a previous `--no-commit` run left uncommitted.
    autoCommit(existing, nextLock)
    return
  }

  writeIfChanged(snapshotPath, snapshotContent)
  writeIfChanged(versionPath, versionContent)

  const lock = { ...nextLock, syncedAt: new Date().toISOString() }
  fs.writeFileSync(LOCK_PATH, `${JSON.stringify(lock, null, 2)}\n`, 'utf8')

  console.log(`Synced contracts from ${apiUrl} (${lock.apiTag}, hash ${lock.hash}).`)
  autoCommit(existing, lock)
}

void main()
