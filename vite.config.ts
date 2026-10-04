import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from '@tanstack/router-plugin/vite'

import { resolveContractsDir } from './scripts/contracts-path.mjs'

// Shared contracts: single source of truth in chat-crm-api/src/contracts.
// Resolved at config time so the same setup works in main checkouts, paired
// worktrees and Docker (CONTRACTS_DIR).
const contractsDir = resolveContractsDir(__dirname)

// https://vite.dev/config/
export default defineConfig({
  // TanStack Router debe ir ANTES de los plugins de transformación JSX.
  plugins: [tanstackRouter({
    target: 'react',
    autoCodeSplitting: true,
  }), react(), tailwindcss()],
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
    fs: {
      // `allow` REPLACES Vite's defaults: the project root must be listed
      // explicitly, otherwise even /index.html gets a 403. Contracts live
      // outside the project root, so both are allowed.
      allow: [__dirname, contractsDir],
    },
  },
})
