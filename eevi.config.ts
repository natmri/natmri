import { join, resolve } from 'path'
import fs from 'fs'
import type { UserConfigExport } from 'eevi'
import { defineConfig } from 'eevi'
import { ElectronPreloadPlugin } from '@eevi/elexpose/esbuild'
import { alias } from './alias'

const appPath = resolve(process.cwd(), 'release', 'app')
const packagePath = resolve(appPath, 'package.json')
const { dependencies } = JSON.parse(fs.readFileSync(packagePath, 'utf8') || '{}')

const define: Record<string, string> = {
  'process.env.URL': process.env.MODE === 'mpa' ? '\'./dist/pages\'' : '\'./dist/index.html\'',
  'process.env.MODE': process.env.MODE === 'mpa' ? '\'mpa\'' : '\'spa\'',
}

if (process.env.NODE_ENV === 'development')
  delete define['process.env.URL']

export default defineConfig({
  entry: './src/main.ts',
  outDir: join(appPath, 'dist'),
  preloadEntriesDir: resolve(process.cwd(), './src/natmri/base/parts/preload'),
  preloadEntries: ['*.ts'],
  preloadPlugins: [ElectronPreloadPlugin()],
  resolve: {
    alias,
  },
  external: [...Object.keys(dependencies || {})],
  tsconfig: resolve(process.cwd(), 'src', 'tsconfig.json'),
  sourcemap: process.env.NATMRI_DEV ? 'inline' : false,
  define,
}) as UserConfigExport
