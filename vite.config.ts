import { join } from 'node:path'
import { defineConfig } from 'vitest/config'
import { splitVendorChunkPlugin } from 'vite'
import { ElectronRendererPlugin } from '@eevi/elexpose/vite'
import Solid from 'vite-plugin-solid'
import UnoCSS from 'unocss/vite'
import { presetAttributify, presetIcons, presetTypography, presetUno, transformerAttributifyJsx, transformerDirectives } from 'unocss'
import ViteElectronPlugin from 'eevi'
import { IS_TEST, outputDistPath as outDir, resolve, srcPath as root, rootPath, setupDevelopmentEnvironment } from './scripts/utils'

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
  plugins: [
    ...IS_TEST
      ? []
      : [
          Solid(),
          UnoCSS({
            rules: [
              ['region-drag', { '-webkit-app-region': 'drag' }],
              ['region-no', { '-webkit-app-region': 'no-drag' }],
            ],
            shortcuts: {
              'n-btn': 'px-4 py-1 text-sm text-purple-600 font-semibold rounded-full border border-purple-200 hover:text-white hover:bg-purple-600 hover:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2',
            },
            presets: [
              presetUno(),
              presetTypography(),
              presetAttributify(),
              presetIcons(),
            ],
            transformers: [
              transformerDirectives(),
              transformerAttributifyJsx(),
            ],
          }),
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
