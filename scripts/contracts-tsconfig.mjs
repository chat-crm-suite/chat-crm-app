import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { resolveContractsDir } from './contracts-path.mjs'

/**
 * Generates `tsconfig.contracts.json` (gitignored) with the resolved contracts
 * path. `tsconfig.app.json` extends it, because TypeScript cannot resolve the
 * contracts dynamically (Vite/Vitest do, via `resolveContractsDir`).
 *
 * A generated tsconfig is used instead of a symlink/junction on purpose:
 * recursive deletes (git, rm -rf) follow Windows junctions and once wiped the
 * API contracts folder through `.contracts`. No links, no risk.
 *
 * Runs on `postinstall`; skipped inside Docker dev
 * (`CONTRACTS_TSCONFIG_DISABLE=1`) because the bind mount would leave a
 * container-path tsconfig behind on the host.
 */
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
)

if (process.env.CONTRACTS_TSCONFIG_DISABLE === '1') {
  console.log(
    '[@chat-crm/contracts] tsconfig skipped (CONTRACTS_TSCONFIG_DISABLE=1)'
  )
  process.exit(0)
}

const target = resolveContractsDir(repoRoot)
  .replaceAll('\\', '/')
  .concat('/index.ts')

const tsconfigPath = path.join(repoRoot, 'tsconfig.contracts.json')
const contents = `${JSON.stringify(
  {
    compilerOptions: {
      paths: {
        '@/*': ['./src/*'],
        '@chat-crm/contracts': [target],
      },
    },
  },
  null,
  2
)}\n`

fs.writeFileSync(tsconfigPath, contents, 'utf8')
console.log(`[@chat-crm/contracts] wrote tsconfig.contracts.json -> ${target}`)
