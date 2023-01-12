import fs, { promises as fsp } from 'node:fs'
import { appModulesPath, appPackagePath, linkModules, linkPackageFile, srcElectronModulesPath, srcElectronPackagePath } from './utils'

// if dependencies is {}, pnpm can't generate `node_modules`
if (!fs.existsSync(appModulesPath))
  fs.mkdirSync(appModulesPath)

const _linkModules = linkModules.bind(undefined, appModulesPath, srcElectronModulesPath)
const _linkPackageFile = linkPackageFile.bind(undefined, appPackagePath, srcElectronPackagePath)

fsp.lstat(srcElectronModulesPath)
  .then(stat => stat.isSymbolicLink())
  .then(v => !v && _linkModules())
  .catch(_linkModules)

fsp.lstat(srcElectronPackagePath)
  .then(stat => stat.isSymbolicLink())
  .then(v => !v && _linkPackageFile())
  .catch(_linkPackageFile)
