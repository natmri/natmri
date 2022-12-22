import { join } from 'node:path'
import { cwd } from 'node:process'
import { defineConfig, splitVendorChunkPlugin } from 'vite'
import Solid from 'vite-plugin-solid'
import UnoCSS from 'unocss/vite'
import ViteElectronPlugin from 'eevi'
import { ElectronRendererPlugin } from '@eevi/elexpose/vite'
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
    Solid(),
    UnoCSS(),
    ViteElectronPlugin(),
    ElectronRendererPlugin([
      'wallpaper',
    ]),
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
