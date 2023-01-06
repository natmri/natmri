import { join } from 'node:path'
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { appModulesPath, appPackagePath, appPath, rootPath } from './utils'

const { dependencies } = JSON.parse(readFileSync(appPackagePath, 'utf8'))

if (Object.keys(dependencies || {}).length > 0 && existsSync(appModulesPath)) {
  const electronRebuildCmd
    = join(rootPath, 'node_modules/.bin/electron-rebuild')
      .concat(' --force --types prod --module-dir=')
      .concat(appPath)

  const cmd = process.platform === 'win32' ? electronRebuildCmd.replace(/\//g, '\\') : electronRebuildCmd

  execSync(cmd, {
    stdio: 'inherit',
    env: process.env,
  })
}
