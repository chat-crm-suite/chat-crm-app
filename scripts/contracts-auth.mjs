/**
 * Ephemeral auth for the contracts CLI.
 *
 * The backend guards `/contracts/*` with the same JWT as the rest of the API,
 * and the JWT strategy only reads the `access_token` cookie (see
 * `chat-crm-api/src/strategies/jwt.strategy.ts`). So the CLI logs in, keeps the
 * cookie IN MEMORY for the single run, and sends it as a `Cookie` header.
 *
 * Nothing is ever written to disk: credentials live only for the process
 * lifetime and are discarded on exit.
 *
 * Credential resolution order (first match wins):
 *   1. `-u`/`--username` and `-p`/`--password`
 *   2. `API_USERNAME` / `API_PASSWORD` (CI; no prompt)
 *   3. interactive prompt (username visible, password hidden) — only with a TTY
 *
 * The token, cookie and argv are never logged, not even in `--verbose`.
 */
import readline from 'node:readline'

function trimBase(url) {
  return url.replace(/\/$/, '')
}

function readFlag(argv, short, long) {
  const index = argv.findIndex((value) => value === short || value === long)
  if (index === -1) return null
  const value = argv[index + 1]
  return value && !value.startsWith('-') ? value : null
}

/** Flags > env. Returns nulls when neither is present. */
export function resolveCredentials(argv = process.argv) {
  return {
    username: readFlag(argv, '-u', '--username') ?? process.env.API_USERNAME ?? null,
    password: readFlag(argv, '-p', '--password') ?? process.env.API_PASSWORD ?? null,
  }
}

function promptVisible(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

/** Reads a line without echoing it (raw mode). Requires a TTY. */
function promptHidden(question) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process
    if (!stdin.isTTY) {
      reject(new Error('no TTY available for a password prompt'))
      return
    }

    stdout.write(question)
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')

    let value = ''

    const cleanup = () => {
      stdin.setRawMode(false)
      stdin.pause()
      stdin.removeListener('data', onData)
      stdout.write('\n')
    }

    const onData = (char) => {
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          cleanup()
          resolve(value)
          break
        case '\u0003': // Ctrl-C
          cleanup()
          process.exit(130)
          break
        case '\u007f':
        case '\b':
          value = value.slice(0, -1)
          break
        default:
          value += char
      }
    }

    stdin.on('data', onData)
  })
}

/** POST /auth/login and return the `access_token` cookie pair (in memory). */
export async function login(apiUrl, username, password) {
  const response = await fetch(`${trimBase(apiUrl)}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
    redirect: 'manual',
  })

  if (!response.ok) {
    throw new Error(`login -> HTTP ${response.status}`)
  }

  const setCookies =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean)

  const cookie = setCookies
    .map((entry) => entry.split(';')[0])
    .filter(Boolean)
    .join('; ')

  if (!cookie) {
    throw new Error('login did not return a session cookie')
  }

  return cookie
}

/**
 * Resolves credentials (flags → env → prompt) and logs in. Returns the cookie
 * header value. Never persists anything.
 */
export async function obtainSessionCookie({ apiUrl, argv = process.argv }) {
  const interactive = Boolean(process.stdin.isTTY)
  const credentials = resolveCredentials(argv)

  let { username, password } = credentials

  if (!username) {
    if (!interactive) {
      throw new Error('missing username: pass -u/--username or API_USERNAME (no TTY to prompt)')
    }
    username = await promptVisible('Username: ')
  }

  if (!password) {
    if (!interactive) {
      throw new Error('missing password: pass -p/--password or API_PASSWORD (no TTY to prompt)')
    }
    password = await promptHidden('Password: ')
  }

  return login(apiUrl, username, password)
}

/** GET a route with the in-memory session cookie. */
export function authenticatedFetch(apiUrl, route, cookie) {
  return fetch(`${trimBase(apiUrl)}${route}`, { headers: { cookie } })
}
