import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/**
 * Installs agent skills from `skills-lock.json` (source of truth, like
 * `package.json` for npm deps) using the skills.sh CLI
 * (`pnpm dlx skills@latest`), without committing `.agents/` nor `.claude/`.
 *
 * Usage:
 *   pnpm skills:install               # install every skill in the lock
 *   pnpm skills:install -- --skill tdd
 *   node scripts/skills-install.mjs --check
 *   node scripts/skills-install.mjs --skill tdd
 *
 * Flags:
 *   --check        only verify `.agents/skills/<name>/SKILL.md` and
 *                  `.claude/skills/<name>/SKILL.md` exist, do not install.
 *   --skill <n>   install/check only skill `<n>` (matches lock key).
 *
 * Install targets both agents to keep the current duplication:
 *   -a opencode    -> `.agents/skills/`
 *   -a claude-code -> `.claude/skills/`
 * `--copy` is used on purpose: Windows junctions/symlinks need privileges
 * and break `git rm`/deletes; copies behave like the committed files today.
 */

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const lockPath = path.join(repoRoot, 'skills-lock.json')

const AGENTS = ['opencode', 'claude-code']
const TARGETS = [
  { agent: 'opencode', dir: path.join(repoRoot, '.agents', 'skills') },
  { agent: 'claude-code', dir: path.join(repoRoot, '.claude', 'skills') },
]

function usage(exitCode = 0) {
  console.log(
    [
      'Usage:',
      '  node scripts/skills-install.mjs [--check] [--skill <name>]',
      '',
      'Reads skills-lock.json and installs with:',
      '  pnpm dlx skills@latest add <source> --skill <name> -a opencode -a claude-code --copy -y',
      'Entries sharing the same `source` are installed in a single CLI call.',
    ].join('\n'),
  )
  process.exit(exitCode)
}

const argv = process.argv.slice(2)
if (argv.includes('-h') || argv.includes('--help')) usage(0)

const checkOnly = argv.includes('--check')
const skillIdx = argv.indexOf('--skill')
const onlySkill = skillIdx >= 0 ? argv[skillIdx + 1] : null
if (skillIdx >= 0 && !onlySkill) {
  console.error('error: --skill requires a value (lock key, e.g. --skill tdd)')
  process.exit(2)
}

if (!fs.existsSync(lockPath)) {
  console.error(`error: lockfile not found: ${lockPath}`)
  process.exit(2)
}

const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'))
const entries = Object.entries(lock.skills ?? {})
if (entries.length === 0) {
  console.log('[skills] lock has no entries, nothing to do.')
  process.exit(0)
}

const filtered = onlySkill
  ? entries.filter(([name]) => name === onlySkill)
  : entries
if (filtered.length === 0) {
  console.error(`error: skill "${onlySkill}" not found in skills-lock.json`)
  process.exit(2)
}

function missingTargets(name) {
  return TARGETS.filter(
    ({ dir }) => !fs.existsSync(path.join(dir, name, 'SKILL.md')),
  ).map(({ agent }) => agent)
}

if (checkOnly) {
  const missing = filtered.flatMap(([name]) =>
    missingTargets(name).map((agent) => `${name} (missing for ${agent})`),
  )
  if (missing.length > 0) {
    console.error('[skills] missing skills:')
    for (const m of missing) console.error(`  - ${m}`)
    console.error('\nrun: pnpm skills:install')
    process.exit(1)
  }
  console.log(`[skills] ok: ${filtered.length} skill(s) present in .agents + .claude`)
  process.exit(0)
}

// Group by `source` so repos with many skills (e.g. mattpocock/skills)
// are cloned once: one CLI call with repeated `--skill <name>`.
const bySource = new Map()
for (const [name, meta] of filtered) {
  if (!meta?.source) {
    console.error(`error: skill "${name}" has no "source" in skills-lock.json`)
    process.exit(2)
  }
  if (!bySource.has(meta.source)) bySource.set(meta.source, [])
  bySource.get(meta.source).push(name)
}

let failed = 0
const quote = (s) =>
  /[^A-Za-z0-9_@./=-]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s
for (const [source, names] of bySource) {
  const parts = [
    'pnpm',
    'dlx',
    'skills@latest',
    'add',
    source,
    ...names.flatMap((n) => ['--skill', n]),
    ...AGENTS.flatMap((a) => ['-a', a]),
    '--copy',
    '-y',
  ]
  const cmd = parts.map(quote).join(' ')
  console.log(`[skills] ${cmd}`)
  // String + shell:true (no args array) avoids NODE DEP0190 and resolves
  // pnpm.cmd on Windows.
  const res = spawnSync(cmd, { stdio: 'inherit', shell: true })
  if (res.status !== 0) {
    console.error(`[skills] failed for source ${source} (exit ${res.status})`)
    failed += 1
    continue
  }
  // Post-check: warn (do not fail) when a target SKILL.md is still absent,
  // e.g. upstream renamed the skill or discovery path changed.
  for (const name of names) {
    for (const m of missingTargets(name)) {
      console.warn(`[skills] warning: ${name} installed but absent for ${m}`)
    }
  }
}

if (failed > 0) {
  console.error(`[skills] ${failed} source(s) failed. Fix and re-run: pnpm skills:install`)
  process.exit(1)
}
console.log(`[skills] done: ${filtered.length} skill(s) from ${bySource.size} source(s).`)
