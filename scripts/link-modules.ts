import fs, { promises as fsp } from 'node:fs'
import { appModulesPath, appPackagePath, linkModules, linkPackageFile, srcModulesPath, srcPackagePath } from './utils'

// if dependencies is {}, pnpm can't generate `node_modules`
if (!fs.existsSync(appModulesPath))
  fs.mkdirSync(appModulesPath)

const _linkModules = linkModules.bind(undefined, appModulesPath, srcModulesPath)
const _linkPackageFile = linkPackageFile.bind(undefined, appPackagePath, srcPackagePath)

fsp.lstat(srcModulesPath)
  .then(stat => stat.isSymbolicLink())
  .then(v => !v && _linkModules())
  .catch(_linkModules)

fsp.lstat(srcPackagePath)
  .then(stat => stat.isSymbolicLink())
  .then(v => !v && _linkPackageFile())
  .catch(_linkPackageFile)
