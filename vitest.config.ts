import path from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'

import { resolveContractsDir } from './scripts/contracts-path'

const contractsDir = resolveContractsDir(__dirname)

// Config de tests independiente del vite.config (sin el plugin de rutas de
// TanStack, que no hace falta para unit tests).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@chat-crm/contracts': path.join(contractsDir, 'index.ts'),
    },
    dedupe: ['zod'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
})
