import { existsSync, promises as fsp } from 'node:fs'
import { join } from 'node:path'
import yaml from 'yaml'
import type { Configuration } from 'electron-builder'
import builder from 'electron-builder'
import fileConfiguration from '../$electron-builder.json'
import { cleanFiles } from './clean'
import { appModulesPath, appPackagePath, appPath, buildResourcePath, outputAppPath, outputModulePath, outputPackagePath, rimraf } from './utils'

const configuration: Configuration = {
  ...fileConfiguration as any,
}
let nshContent: string
const nshFilePath = join(buildResourcePath, 'windows', 'installer.nsh')

async function beforeMake() {
  await cleanFiles()

  await Promise.all([
    // copy app/.npmrc to out-build
    fsp.cp(join(appPath, '.npmrc'), join(outputAppPath, '.npmrc'), { force: true }),
    // copy app/package.json to out-build
    fsp.cp(appPackagePath, outputPackagePath, { force: true }),
    async () => {
      // copy app/node_module to out-build
      await fsp.cp(appModulesPath, outputModulePath, { force: true, recursive: true })
      // rewrite virtual store dir
      return fsp.readFile(join(outputModulePath, '.modules.yaml'), 'utf8')
        .then((modulesContent) => {
          const modules = yaml.parse(modulesContent)
          modules.virtualStoreDir = join(outputModulePath, '.pnpm')
          return modules
        })
        .then(modules => fsp.writeFile(join(outputModulePath, '.modules.yaml'), yaml.stringify(modules), 'utf8'))
    },
    async () => {
      if (existsSync(nshFilePath)) {
        const productName = fileConfiguration.productName ?? ''
        nshContent = await fsp.readFile(nshFilePath, 'utf-8')
        return fsp.writeFile(nshFilePath, nshContent.slice().replace('$1', productName))
      }
    },
  ])

  return configuration
}

async function doMakeInstaller(configuration: Configuration) {
  return await builder.build({
    config: {
      ...configuration,
      copyright: `Copyright © ${new Date().getFullYear()} \$\{author\}`,
    },
    publish: process.env.BUILDER__PUBLISH as any,
  })
}

async function afterMake(result: string[]) {
  for (const r of result.filter(r => !r.includes('blockmap')))
    console.log(`  \x1B[92m\x1B[1mMake ${r} successfully  `)

  await Promise.allSettled([
    fsp.writeFile(nshFilePath, nshContent),
    rimraf(outputAppPath),
  ])
}

Promise.resolve()
  .then(beforeMake)
  .then(doMakeInstaller)
  .then(afterMake)
  .catch(console.error)
