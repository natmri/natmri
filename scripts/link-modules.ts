import fs from 'fs-extra'
import consola from 'consola'
import { appModulesPath, appPackagePath, srcElectronModulesPath, srcElectronPackagePath } from './utils'

// if dependencies is {}, pnpm can't generate `node_modules`
if (!fs.existsSync(appModulesPath))
  fs.mkdirSync(appModulesPath)

async function linkModules() {
  return await fs.symlink(appModulesPath, srcElectronModulesPath, 'junction')
}

async function linkPackageFile() {
  return await fs.symlink(appPackagePath, srcElectronPackagePath, 'file')
}

fs.lstat(srcElectronModulesPath)
  .then(stat => stat.isSymbolicLink())
  .then(v => !v && linkModules())
  .catch(linkModules)
  .catch(consola.error)

fs.lstat(srcElectronPackagePath)
  .then(stat => stat.isSymbolicLink())
  .then(v => !v && linkPackageFile())
  .catch(linkPackageFile)
  .catch(consola.error)

