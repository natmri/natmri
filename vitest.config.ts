import { defineConfig } from 'vitest/config'
import { splitVendorChunkPlugin } from 'vite'
import UnoCSS from 'unocss/vite'
import ViteElectronPlugin from 'eevi'
import { ElectronRendererPlugin } from '@eevi/elexpose/vite'
import { alias } from './alias'

export default defineConfig({
  clearScreen: false,
  base: './',
  resolve: {
    alias,
  },
  plugins: [
    UnoCSS(),
    ViteElectronPlugin(),
    ElectronRendererPlugin([
      'wallpaper',
    ]),
    splitVendorChunkPlugin(),
  ],
  test: {
    environment: 'happy-dom',
    testTimeout: 1000 * 60 * 25,
    hookTimeout: 1000 * 10,
    globals: true,
  },
})
