import { basename, join } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import uno from 'unocss/vite'
import auto from 'unplugin-auto-import/vite'
import { createRendererInputs, createSandboxInputs, srcPath as root } from './scripts/utils'

export default defineConfig({
  main: {
    build: {
      minify: 'terser',
      outDir: './out/natmri',
      emptyOutDir: false,
      rollupOptions: {
        input: './src/background.ts',
        output: {
          entryFileNames: '[name].mjs',
          format: 'es',
        },
      },
    },
    plugins: [
      externalizeDepsPlugin(),
    ],
    resolve: {
      alias: [
        {
          replacement: join(root, 'natmri'),
          find: 'natmri',
        },
        {
          replacement: join(root, 'typings'),
          find: 'typings',
        },
      ],
    },
  },
  preload: {
    build: {
      minify: 'terser',
      outDir: './out/natmri/electron-sandbox',
      emptyOutDir: false,
      rollupOptions: {
        input: createSandboxInputs(),
      },
    },
    plugins: [
      externalizeDepsPlugin(),
    ],
    resolve: {
      alias: [
        {
          replacement: join(root, 'natmri'),
          find: 'natmri',
        },
        {
          replacement: join(root, 'typings'),
          find: 'typings',
        },
      ],
    },
  },
  renderer: {
    root: './src',
    base: './src',
    build: {
      minify: 'terser',
      emptyOutDir: false,
      outDir: './out',
      rollupOptions: {
        input: createRendererInputs(),
      },
    },
    resolve: {
      alias: [
        {
          replacement: join(root, 'natmri'),
          find: 'natmri',
        },
        {
          replacement: join(root, 'typings'),
          find: 'typings',
        },
      ],
    },
    plugins: [
      uno(),
      vue(),
      auto({
        dts: './auto-imports.d.ts',
        imports: [
          'vue',
          '@vueuse/core',
        ],
      }),
    ],
    // [#13736](https://github.com/vitejs/vite/issues/13736)
    optimizeDeps: {
      esbuildOptions: {
        tsconfigRaw: {
          compilerOptions: {
            experimentalDecorators: true,
          },
        },
      },
    },
  },
})
