import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { resolveContractsDir } from './contracts-path.mjs'

/**
 * Creates the stable `.contracts` symlink used by `tsconfig.app.json`
 * (TypeScript cannot resolve the contracts dynamically, unlike Vite/Vitest).
 *
 * Runs on `postinstall`; skipped inside Docker dev (`CONTRACTS_LINK_DISABLE=1`)
 * because the bind mount would leave a host-broken link behind.
 */
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
)

if (process.env.CONTRACTS_LINK_DISABLE === '1') {
  console.log('[@chat-crm/contracts] link skipped (CONTRACTS_LINK_DISABLE=1)')
  process.exit(0)
}

const target = resolveContractsDir(repoRoot)
const link = path.join(repoRoot, '.contracts')

fs.rmSync(link, { recursive: true, force: true })
fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir')

console.log(`[@chat-crm/contracts] linked ${link} -> ${target}`)
