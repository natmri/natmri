import { join, resolve } from 'path'
import fs from 'fs'
import { defineConfig } from 'eevi'
import { ElectronPreloadPlugin } from '@eevi/elexpose/esbuild'
import type { UserConfigExport } from 'eevi'
import { alias } from './alias'

const appPath = resolve(process.cwd(), 'release', 'app')
const packagePath = resolve(appPath, 'package.json')
const { dependencies } = JSON.parse(fs.readFileSync(packagePath, 'utf8') || '{}')

export default defineConfig({
  entry: './src/main.ts',
  outDir: join(appPath, 'dist'),
  preloadOutDir: './natmri',
  preloadEntries: [
    'src/natmri/base/parts/preload/*.ts',
    'src/natmri/platform/wallpaper/electron-preload/wallpaper.ts',
  ],
  preloadPlugins: [ElectronPreloadPlugin()],
  resolve: {
    alias,
  },
  external: [...Object.keys(dependencies || {})],
  tsconfig: resolve(process.cwd(), 'src', 'tsconfig.json'),
  sourcemap: process.env.NATMRI_DEV ? 'inline' : false,
  watch: {
    autoReload: true,
    reloadTime: 1000,
  },
}) as UserConfigExport
