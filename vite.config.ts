/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { alias } from './alias'

export default defineConfig({
  resolve: {
    alias,
  },
  test: {
    environment: 'happy-dom',
    testTimeout: 1000 * 60 * 25,
    hookTimeout: 1000 * 10,
    globals: true,
  },
})
