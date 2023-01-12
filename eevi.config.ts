import { join } from 'path'
import { defineConfig } from 'eevi'
import { ElectronPreloadPlugin } from '@eevi/elexpose/esbuild'
import type { UserConfigExport } from 'eevi'
import { outputDistPath as outDir, resolve } from './scripts/utils'
import { dependencies } from './app/package.json'

export default defineConfig({
  entry: './src/main.ts',
  outDir,
  preloadOutDir: './natmri',
  preloadEntries: [
    'src/natmri/base/parts/preload/*.ts',
    'src/natmri/platform/wallpaper/electron-preload/wallpaper.ts',
  ],
  preloadPlugins: [ElectronPreloadPlugin()],
  resolve,
  external: [...Object.keys(dependencies || {})],
  tsconfig: join(process.cwd(), 'src', 'tsconfig.json'),
  sourcemap: process.env.NATMRI_DEV ? 'inline' : false,
  watch: {
    autoReload: true,
    reloadTime: 1000,
  },
}) as UserConfigExport
