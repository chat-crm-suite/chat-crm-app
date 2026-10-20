import path from 'path'
import fs from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from '@tanstack/router-plugin/vite'

import { resolveContractsDir } from './scripts/contracts-path.mjs'

// Shared contracts: single source of truth in chat-crm-api/src/contracts.
// Resolved at config time so the same setup works in main checkouts, paired
// worktrees and Docker (CONTRACTS_DIR).
const contractsDir = resolveContractsDir(__dirname)

// Dev proxy (Docker): with VITE_DEV_PROXY_TARGET (e.g. http://api:3000) and a
// same-origin VITE_API_URL (e.g. /api), the browser only talks to this server
// and Vite forwards to the API over the compose network, like Caddy in prod:
// `<VITE_API_URL>/*` with the prefix stripped, and Socket.IO's own path.
const SOCKET_IO_PATH = '/socket.io'
const devProxyTarget = process.env.VITE_DEV_PROXY_TARGET
const apiBasePath = process.env.VITE_API_URL?.startsWith('/')
  ? process.env.VITE_API_URL.replace(/\/+$/, '')
  : null
const devProxy =
  devProxyTarget && apiBasePath
    ? {
        [apiBasePath]: {
          target: devProxyTarget,
          changeOrigin: true,
          rewrite: (url: string) => url.slice(apiBasePath.length) || '/',
        },
        [SOCKET_IO_PATH]: { target: devProxyTarget, changeOrigin: true, ws: true },
      }
    : undefined

// Bakes the synced contracts fingerprint into the bundle so the dev-only
// runtime check can compare it with `GET /contracts/version`. `null` when the
// frontend has not been synced yet (no contracts.lock.json).
function readLockHash(): string | null {
  try {
    const lock = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, 'contracts.lock.json'), 'utf8')
    )
    return typeof lock.hash === 'string' ? lock.hash : null
  } catch {
    return null
  }
}

// https://vite.dev/config/
export default defineConfig({
  // TanStack Router debe ir ANTES de los plugins de transformación JSX.
  plugins: [tanstackRouter({
    target: 'react',
    autoCodeSplitting: true,
  }), react(), tailwindcss()],
  define: {
    // Consumed by the dev-only runtime contracts check (src/lib/contracts-sync.ts).
    __CONTRACTS_LOCK_HASH__: JSON.stringify(readLockHash()),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Raw TypeScript consumed without a build step.
      "@chat-crm/contracts": path.join(contractsDir, "index.ts"),
    },
    // The API also depends on zod: keep a single copy in the bundle.
    dedupe: ["zod"],
  },
  server: {
    proxy: devProxy,
    watch: {
      // Docker on Windows polls every watched file (CHOKIDAR_USEPOLLING): skip
      // the paired worktrees (full copies of the app) and build output, or the
      // polling saturates the I/O threadpool and every first request takes seconds.
      ignored: ['**/.worktrees/**', '**/dist/**', '**/.tanstack/**'],
      // chokidar polls every 100 ms by default, which keeps the bind mount busy.
      ...(process.env.CHOKIDAR_USEPOLLING
        ? { usePolling: true, interval: 1000, binaryInterval: 3000 }
        : {}),
    },
    fs: {
      // `allow` REPLACES Vite's defaults: the project root must be listed
      // explicitly, otherwise even /index.html gets a 403. Contracts live
      // outside the project root, so both are allowed.
      allow: [__dirname, contractsDir],
    },
  },
})
