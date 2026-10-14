/**
 * `pnpm contracts:status` — reports whether this frontend is in sync with a
 * backend, verifying ONLY through the backend endpoint (no sibling checkout, no
 * remote tarball). Point it at dev (localhost) or prod with the same command.
 *
 * Usage:
 *   pnpm contracts:status [--api-url URL] [-u USER] [-p PASS] [--verbose]
 *
 * Credentials are flags (-u/-p) → env (API_USERNAME/API_PASSWORD) → prompt, and
 * live only in memory for this run.
 *
 * Exit codes: 0 in sync · 1 drift/uncommitted · 2 not initialized/unverifiable.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { authenticatedFetch, obtainSessionCookie } from './contracts-auth.mjs'
import { evaluateContractsStatus, renderContractsStatus } from './contracts-status-core.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
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

function readLock() {
  if (!fs.existsSync(LOCK_PATH)) return null
  try {
    return JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'))
  } catch {
    return null
  }
}

function uncommittedContracts() {
  try {
    const out = execFileSync(
      'git',
      ['status', '--porcelain', '--', 'src/generated', 'contracts.lock.json'],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    ).trim()
    return out ? out.split('\n') : []
  } catch {
    return []
  }
}

async function fetchManifest(apiUrl, cookie) {
  const response = await authenticatedFetch(apiUrl, '/contracts/manifest', cookie)
  if (!response.ok) throw new Error(`/contracts/manifest -> HTTP ${response.status}`)
  return response.json()
}

async function main() {
  const verbose = process.argv.includes('--verbose')
  const apiUrl = arg('api-url') || process.env.VITE_API_URL || readViteApiUrl() || 'http://localhost:3000'

  const lock = readLock()

  let manifest = null
  let detail = null

  if (lock) {
    try {
      const cookie = await obtainSessionCookie({ apiUrl })
      manifest = await fetchManifest(apiUrl, cookie)
    } catch (error) {
      detail = error.message
    }
  }

  const result = evaluateContractsStatus({
    lock,
    manifest,
    uncommitted: uncommittedContracts(),
    detail,
  })
  console.log(renderContractsStatus(result, { verbose }))
  process.exit(result.exitCode)
}

void main()
