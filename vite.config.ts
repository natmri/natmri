import { join } from 'node:path'
import { defineConfig } from 'vitest/config'
import { splitVendorChunkPlugin } from 'vite'
import Solid from 'vite-plugin-solid'
import UnoCSS from 'unocss/vite'
import ViteElectronPlugin from 'eevi'
import { ElectronRendererPlugin } from '@eevi/elexpose/vite'
import { IN_TEST, outputDistPath as outDir, resolve, rootPath, setupDevelopmentEnvironment, srcPath } from './scripts/utils'

const NATMRI_ROOT = join(srcPath, 'natmri')
const NATMRI_STORE = join(NATMRI_ROOT, 'store')

await setupDevelopmentEnvironment()

const input: Record<string, string> = {
  store: join(NATMRI_STORE, 'electron-sandbox', 'natmri-store.html'),
}

export default defineConfig({
  appType: 'mpa',
  root: srcPath,
  resolve,
  json: {
    stringify: true,
  },
  plugins: [
    IN_TEST
      ? []
      : [
          Solid(),
          UnoCSS(),
          ViteElectronPlugin(),
          ElectronRendererPlugin([
            'wallpaper',
          ])],
    splitVendorChunkPlugin(),
  ],
  build: {
    target: 'esnext',
    assetsDir: 'natmri/assets',
    rollupOptions: {
      input,
    },
    outDir,
    emptyOutDir: false,
  },
  cacheDir: join(rootPath, '.vite'),
})
