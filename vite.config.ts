import path from 'node:path'
import { defineConfig } from 'vitest/config'
import React from '@vitejs/plugin-react-swc'
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
    React(),
    UnoCSS(),
    eevi(),
    // SPA remove it and pages dir, MPA require it
    mpa({
      template: './index.html',
      pages: [
        {
          name: 'main',
          entry: './pages/main.tsx',
          data: {
            title: 'Main Page',
          },
        },
        {
          name: 'other',
          entry: './pages/other.tsx',
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
