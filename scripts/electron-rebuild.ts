import { join } from 'path'
import { execSync } from 'child_process'
import fs from 'fs'
import { appModulesPath, appPackagePath, appPath, rootPath } from './utils'

const { dependencies } = JSON.parse(fs.readFileSync(appPackagePath, 'utf-8'))

if (Object.keys(dependencies || {}).length > 0 && fs.existsSync(appModulesPath)) {
  const electronRebuildCmd
    = join(rootPath, 'node_modules/.bin/electron-rebuild')
      .concat(' --force --types prod --module-dir=')
      .concat(appPath)

  const cmd = process.platform === 'win32' ? electronRebuildCmd.replace(/\//, '\\') : electronRebuildCmd

  execSync(cmd, {
    stdio: 'inherit',
    env: process.env,
  })
}
