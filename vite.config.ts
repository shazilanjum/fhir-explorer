import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Honor a PORT injected by the environment (e.g. preview tooling) so the
    // proxy can reach the dev server; fall back to Vite's default otherwise.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
})
