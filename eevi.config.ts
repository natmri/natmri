import { defineConfig } from 'eevi'
import { ElectronPreloadPlugin } from '@eevi/elexpose/esbuild'
import { IS_DEV, outputDistPath as outDir, resolve, srcTsConfigPath as tsconfig } from './scripts/utils'
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
  external: Object.keys(dependencies || {}),
  sourcemap: process.env.NATMRI_MAP ? true : IS_DEV ? 'inline' : false,
  resolve,
  tsconfig,
  watch: {
    autoReload: true,
    reloadTime: 1000,
  },
})
