import { existsSync, promises as fsp } from 'node:fs'
import { join } from 'node:path'
import type { Configuration } from 'electron-builder'
import builder from 'electron-builder'
import fileConfiguration from '../$electron-builder.json'
import { cleanFiles, cleanNativeModule } from './clean'
import { appModulesPath, appPackagePath, buildResourcePath, outputAppPath, outputModulePath, outputPackagePath } from './utils'

let nshContent: string
const nshFilePath = join(buildResourcePath, 'windows', 'installer.nsh')

async function beforeMake() {
  await cleanFiles()

  const configuration: Configuration = {
    ...fileConfiguration as any,
  }

  await Promise.all([
    // copy app/package.json to out-build
    fsp.cp(appPackagePath, outputPackagePath, { force: true }),
    // copy app/node_module to out-build
    fsp.cp(appModulesPath, outputModulePath, { force: true, recursive: true }),
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
      beforeBuild: async () => {
        await cleanNativeModule()
      },
    },
    publish: process.env.BUILDER__PUBLISH as any,
  })
}

async function afterMake(result: string[]) {
  for (const r of result)
    console.log(`\t\x1B[32m\x1B[1mMake ${r} successfully\x1B[0m`)

  await Promise.allSettled([
    fsp.writeFile(nshFilePath, nshContent),
    fsp.rm(outputAppPath, { recursive: true }),
  ])
}

Promise.resolve()
  .then(beforeMake)
  .then(doMakeInstaller)
  .then(afterMake)
  .catch(console.error)
