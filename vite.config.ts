import { join } from 'node:path'
import { cwd } from 'node:process'
import { defineConfig } from 'vitest/config'
import React from '@vitejs/plugin-react-swc'
import UnoCSS from 'unocss/vite'
import { eevi as ViteElectronPlugin } from 'eevi'
import { alias } from './alias'

const NATMRI_ROOT = join(cwd(), 'src', 'natmri')
const BROWSER_STORE = join(NATMRI_ROOT, 'browser-store', 'electron-browser')
const OUT_DIR = join(cwd(), 'release', 'app', 'dist')

export default defineConfig({
  clearScreen: false,
  base: './',
  root: NATMRI_ROOT,
  resolve: {
    alias,
  },
  plugins: [
    React(),
    UnoCSS(),
    ViteElectronPlugin(),
  ],
  build: {
    rollupOptions: {
      input: {
        main: join(BROWSER_STORE, 'natmri', 'index.html'),
      },
    },
    outDir: OUT_DIR,
    emptyOutDir: false,
  },
  test: {
    environment: 'happy-dom',
    testTimeout: 1000 * 60 * 25,
    hookTimeout: 1000 * 10,
    globals: true,
  },
})
