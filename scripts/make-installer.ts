import fs from 'node:fs'
import { join } from 'node:path'
import consola from 'consola'
import type { Configuration } from 'electron-builder'
import builder from 'electron-builder'
import fileConfiguration from '../$electron-builder.json'
import { cleanFiles, cleanNativeModule } from './clean'
import { buildResourcePath } from './utils'

let nshContent: string
const nshFilePath = join(buildResourcePath, 'windows', 'installer.nsh')

async function beforeMake() {
  consola.info('before make installer')

  await cleanFiles()

  if (fileConfiguration?.nsis?.include && fs.existsSync(nshFilePath)) {
    const productName = fileConfiguration.productName ?? ''
    nshContent = fs.readFileSync(nshFilePath, 'utf-8')
    fs.writeFileSync(nshFilePath, nshContent.slice().replace('$1', productName))
  }

  const configuration: Configuration = {
    ...fileConfiguration as any,
  }

  return configuration
}

async function doMakeInstaller(configuration: Configuration) {
  consola.info('make installer doing!')

  const result = await builder.build({
    config: {
      ...configuration,
      copyright: `Copyright © ${new Date().getFullYear()} \$\{author\}`,
      beforeBuild: async () => {
        await cleanNativeModule()
      },
    },
    publish: process.env.BUILDER__PUBLISH as any,
  })

  consola.info('make installer done!')

  return result
}

async function afterMake(result: string[]) {
  for (const r of result)
    consola.success(`\x1B[32m\x1B[1mMake ${r} successfully\x1B[0m`)

  if (nshContent)
    fs.writeFileSync(nshFilePath, nshContent)
}

Promise.resolve()
  .then(beforeMake)
  .then(doMakeInstaller)
  .then(afterMake)
  .catch(consola.error)
