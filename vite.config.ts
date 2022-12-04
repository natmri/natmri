/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { alias } from './alias'

export default defineConfig({
  resolve: {
    alias,
  },
  test: {
    environment: 'happy-dom',
    testTimeout: 5000 * 3,
    hookTimeout: 10000,
    globals: true,
  },
})
