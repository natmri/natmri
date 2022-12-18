import path from 'node:path'
import { defineConfig } from 'vitest/config'
import Vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { eevi, mpa } from 'eevi'
import { alias } from './alias'

export default defineConfig({
  clearScreen: false,
  base: './',
  root: './src/natmri/entry/electron-browser',
  resolve: {
    alias,
  },
  plugins: [
    Vue({ reactivityTransform: true }),
    UnoCSS(),
    eevi(),
    // SPA remove it and pages dir, MPA require it
    mpa({
      template: './index.html',
      pages: [
        {
          name: 'main',
          entry: './pages/main.ts',
          data: {
            title: 'Main Page',
          },
        },
        {
          name: 'other',
          entry: './pages/other.ts',
          data: {
            title: 'Other Page',
          },
        },
      ],
    }),
  ] as any[],
  build: {
    rollupOptions: {
      external: ['electron'],
    },
    outDir: path.join(process.cwd(), 'release', 'app', 'dist'),
    emptyOutDir: false,
  },
  test: {
    environment: 'happy-dom',
    testTimeout: 1000 * 60 * 25,
    hookTimeout: 1000 * 10,
    globals: true,
  },
})
