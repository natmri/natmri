import { join } from 'node:path'
import { cwd } from 'node:process'
import { splitVendorChunkPlugin } from 'vite'
import { defineConfig } from 'vitest/config'
import Solid from 'vite-plugin-solid'
import UnoCSS from 'unocss/vite'
import ViteElectronPlugin from 'eevi'
import { ElectronRendererPlugin } from '@eevi/elexpose/vite'
import { alias } from './alias'

const NATMRI_ROOT = join(cwd(), 'src', 'natmri')
const BROWSER_STORE = join(NATMRI_ROOT, 'browser-store', 'electron-browser')
const OUT_DIR = join(cwd(), 'release', 'app', 'dist')
const isTestEnvironment = !!process.env.NATMRI_TEST

export default defineConfig({
  appType: 'mpa',
  base: './',
  root: join(NATMRI_ROOT, '..'), // for src
  resolve: {
    alias,
  },
  plugins: [
    isTestEnvironment
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
    rollupOptions: {
      input: {
        main: join(BROWSER_STORE, 'natmri', 'index.html'),
        settings: join(BROWSER_STORE, 'settings', 'index.html'),
      },
    },
    outDir: OUT_DIR,
    emptyOutDir: false,
  },
})
