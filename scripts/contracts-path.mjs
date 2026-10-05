import fs from 'node:fs'
import path from 'node:path'

const CONTRACTS_ENTRY = 'index.ts'

/**
 * Resolves the shared contracts directory (`chat-crm-api/src/contracts`).
 *
 * The contracts live in the API repo (single source of truth) and the app
 * consumes them as raw TypeScript (no build step), so the real path must be
 * resolved at runtime. Candidates cover:
 * - Docker: `CONTRACTS_DIR` (the compose files mount the folder in the image).
 * - Paired worktrees: `chat-crm-app/.worktrees/<name>` and
 *   `chat-crm-api/.worktrees/<name>` are expected to share the same name.
 * - Main checkouts: both repos cloned side by side.
 *
 * @param {string} repoRoot Absolute path of this repo (chat-crm-app) or of one
 *   of its worktrees.
 * @returns {string} Absolute path of the contracts directory.
 */
export function resolveContractsDir(repoRoot) {
  const worktreeName = path.basename(repoRoot)

  const candidates = [
    process.env.CONTRACTS_DIR,
    path.resolve(
      repoRoot,
      '../../../chat-crm-api/.worktrees',
      worktreeName,
      'src/contracts'
    ),
    path.resolve(repoRoot, '../chat-crm-api/src/contracts'),
    path.resolve(repoRoot, '../../chat-crm-api/src/contracts'),
    path.resolve(repoRoot, '../../../chat-crm-api/src/contracts'),
  ].filter((candidate) => Boolean(candidate))

  const found = candidates.find((candidate) =>
    fs.existsSync(path.join(candidate, CONTRACTS_ENTRY))
  )

  if (!found) {
    throw new Error(
      '[@chat-crm/contracts] Contracts directory not found. Tried:\n' +
        candidates.map((candidate) => `  - ${candidate}`).join('\n')
    )
  }

  return found
}
