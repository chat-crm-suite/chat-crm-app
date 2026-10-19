/**
 * Where the API lives, defined once. Every client (axios, socket, media
 * links, contracts check, health probe) derives its URL from here; no other
 * module reads `VITE_API_URL` / `VITE_SOCKET_URL`.
 *
 * `VITE_API_URL` may be absolute (`https://host/api`, `http://localhost:3000`)
 * or a same-origin path (`/api`): in Docker dev the Vite server proxies `/api`
 * and `/socket.io` to `http://api:3000` over the compose network, like Caddy
 * does in production.
 */

const DEFAULT_API_URL = 'http://localhost:3000'

const trimSlash = (url: string) => url.replace(/\/+$/, '')

/** Base of every API request; may be relative (`/api`). */
export const API_URL = trimSlash(import.meta.env.VITE_API_URL || DEFAULT_API_URL)

/**
 * Absolute form of `API_URL`, for values that leave the browser (the webhook
 * URL pasted into Meta, links): resolved against the page origin when relative.
 */
export const API_PUBLIC_URL = trimSlash(
  new URL(API_URL, window.location.origin).toString()
)

/**
 * Socket.IO server base (no namespace). Defaults to the origin of the API, so
 * a same-origin `/api` keeps the socket on the page origin (proxied too).
 */
export const SOCKET_URL = trimSlash(
  import.meta.env.VITE_SOCKET_URL || new URL(API_PUBLIC_URL).origin
)

/** Liveness route of the API (`GET /health`, public, no DB). */
export const HEALTH_PATH = '/health'
