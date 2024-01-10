import { basename, join } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import solid from 'vite-plugin-solid'
import fg from 'fast-glob'
import uno from 'unocss/vite'
import { srcPath as root } from './scripts/utils'

function createRendererInputs(): Record<string, string> {
  const inputs: Record<string, string> = {}

  const files = fg.sync(
    [
      // ensure posix style path strings
      join(join(root, 'natmri', 'store'), 'electron-sandbox', '**/*.html').replaceAll('\\', '/'),
      join(join(root, 'natmri', 'store'), 'electron-browser', '**/*.html').replaceAll('\\', '/'),
    ],
    {
      absolute: true,
      onlyFiles: true,
    },
  )

  files.forEach((file) => {
    inputs[basename(file, '.html')] = file
  })

  return inputs
}

function createSandboxInputs(): Record<string, string> {
  const inputs: Record<string, string> = {}

  const files = fg.sync(
    [
      join(root, 'natmri/base/parts/preload/*.ts').replaceAll('\\', '/'),
      join(root, 'natmri/platform/wallpaper/electron-preload/wallpaper.ts').replaceAll('\\', '/'),
    ],
    {
      absolute: true,
      onlyFiles: true,
    },
  )

  files.forEach((file) => {
    inputs[basename(file, '.ts')] = file
  })

  return inputs
}

export default defineConfig({
  main: {
    build: {
      outDir: './out/natmri',
      emptyOutDir: false,
      rollupOptions: {
        input: './src/background.ts',
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
    build: {
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
      solid(),
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
