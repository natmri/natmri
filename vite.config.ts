import { join } from 'node:path'
import { cwd } from 'node:process'
import { defineConfig } from 'vitest/config'
import { splitVendorChunkPlugin } from 'vite'
import Solid from 'vite-plugin-solid'
import UnoCSS from 'unocss/vite'
import ViteElectronPlugin from 'eevi'
import { ElectronRendererPlugin } from '@eevi/elexpose/vite'
import { alias } from './alias'

const ROOT = join(cwd(), 'src')
const NATMRI_ROOT = join(ROOT, 'natmri')
const NATMRI_STORE = join(NATMRI_ROOT, 'store')
const outDir = join(cwd(), 'out-build', 'app', 'dist')
const IN_TEST_RUNTIME = !!process.env.NATMRI_TEST

const input: Record<string, string> = {
  store: join(NATMRI_STORE, 'electron-sandbox', 'natmri-store.html'),
}

export default defineConfig({
  appType: 'mpa',
  root: ROOT,
  resolve: {
    alias,
  },
  json: {
    stringify: true,
  },
  plugins: [
    IN_TEST_RUNTIME
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
})
