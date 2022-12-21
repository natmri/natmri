import fs, { promises as fsp } from 'fs'
import consola from 'consola'
import { appModulesPath, appPackagePath, srcElectronModulesPath, srcElectronPackagePath } from './utils'

// if dependencies is {}, pnpm can't generate `node_modules`
if (!fs.existsSync(appModulesPath))
  fs.mkdirSync(appModulesPath)

async function linkModules() {
  return await fsp.symlink(appModulesPath, srcElectronModulesPath, 'junction')
}

async function linkPackageFile() {
  return await fsp.symlink(appPackagePath, srcElectronPackagePath, 'file')
}

fsp.lstat(srcElectronModulesPath)
  .then(stat => stat.isSymbolicLink())
  .then(v => !v && linkModules())
  .catch(linkModules)
  .catch(consola.error)

fsp.lstat(srcElectronPackagePath)
  .then(stat => stat.isSymbolicLink())
  .then(v => !v && linkPackageFile())
  .catch(linkPackageFile)
  .catch(consola.error)
