import { join } from 'node:path'
import { defineConfig } from 'vitest/config'
import { outputDistPath as outDir, VITE_PLUGINS as plugins, resolve, srcPath as root, rootPath, setupDevelopmentEnvironment } from './scripts/utils'

const NATMRI_ROOT = join(root, 'natmri')
const NATMRI_STORE = join(NATMRI_ROOT, 'store')

await setupDevelopmentEnvironment()

const input: Record<string, string> = {
  store: join(NATMRI_STORE, 'electron-sandbox', 'natmri-store.html'),
}

export default defineConfig({
  cacheDir: join(rootPath, '.vite'),
  appType: 'mpa',
  root,
  resolve,
  json: {
    stringify: true,
  },
  plugins,
  build: {
    target: 'esnext',
    assetsDir: 'natmri/assets',
    rollupOptions: {
      input,
    },
    outDir,
    emptyOutDir: false,
  },
})
