import path from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import unocss from 'unocss/vite'
import autoImport from 'unplugin-auto-import/vite'
import autoImportComponent from 'unplugin-vue-components/vite'
import { eevi, mpa } from 'eevi'
import { alias } from '../../alias'

export default defineConfig({
  clearScreen: false,
  base: './',
  root: 'app/web',
  resolve: {
    alias,
  },
  plugins: [
    vue({ reactivityTransform: true }),
    unocss(),
    autoImport({
      dts: './auto-imports.d.ts',
      dirs: [
        './composable',
      ],
      imports: [
        'vue',
        'vue/macros',
      ],
    }),
    autoImportComponent({
      dts: './components.d.ts',
      dirs: [
        './components',
      ],
    }),
    eevi({
      configFile: '../electron/eevi.config.ts',
    }),
    // SPA remove it and pages dir, MPA require it
    mpa({
      template: './public/index.html',
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
  ],
  build: {
    rollupOptions: {
      external: ['electron'],
    },
    outDir: path.join(process.cwd(), 'release', 'app', 'dist'),
    emptyOutDir: false,
  },
})
