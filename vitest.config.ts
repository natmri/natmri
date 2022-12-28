import { defineConfig } from 'vitest/config'
import { splitVendorChunkPlugin } from 'vite'
import UnoCSS from 'unocss/vite'
import Solid from 'vite-plugin-solid'
import { alias } from './alias'

export default defineConfig({
  clearScreen: false,
  base: './',
  resolve: {
    alias,
  },
  plugins: [
    Solid(),
    UnoCSS(),
    splitVendorChunkPlugin(),
  ],
  test: {
    environment: 'happy-dom',
    testTimeout: 1000 * 60 * 25,
    hookTimeout: 1000 * 10,
  },
})
