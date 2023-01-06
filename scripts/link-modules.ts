import fs, { promises as fsp } from 'node:fs'
import { appModulesPath, appPackagePath, srcElectronModulesPath, srcElectronPackagePath } from './utils'

// if dependencies is {}, pnpm can't generate `node_modules`
if (!fs.existsSync(appModulesPath))
  fs.mkdirSync(appModulesPath)

async function linkModules(err?: Error) {
  await fsp.symlink(appModulesPath, srcElectronModulesPath, 'junction')

  if (err)
    throw err
}

async function linkPackageFile(err?: Error) {
  await fsp.symlink(appPackagePath, srcElectronPackagePath, 'file')

  if (err)
    throw err
}

fsp.lstat(srcElectronModulesPath)
  .then(stat => stat.isSymbolicLink())
  .then(v => !v && linkModules())
  .catch(linkModules)
  .catch(console.error)

fsp.lstat(srcElectronPackagePath)
  .then(stat => stat.isSymbolicLink())
  .then(v => !v && linkPackageFile())
  .catch(linkPackageFile)
  .catch(console.error)
