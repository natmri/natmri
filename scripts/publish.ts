import process from 'node:process'
import type { Configuration } from 'electron-builder'
import { build } from 'electron-builder'
import builder from '../electron-builder.json'
import { devDependencies } from '../package.json'
import { cleanFiles } from './clean'
import { MATE, outputAppPath, rimrafTasks } from './utils'

const electronVersion = devDependencies.electron.replaceAll('^', '')

const config: Configuration = {
  ...(builder as Configuration),
  files: [
    ...builder.files,
  ],
  compression: process.platform === 'linux' ? 'normal' : 'maximum',
  copyright: `Copyright © ${MATE.year}-${new Date().getFullYear()} \$\{author\}`,
  electronVersion,
}

await cleanFiles()

const result: string[] = await build({
  config,
  publish: process.env.BUILDER__PUBLISH,
})

await rimrafTasks([
  outputAppPath,
])

for (const r of result.filter(r => !r.includes('blockmap')))
  console.log(`  \x1B[92m\x1B[1mMake ${r} successfully  `)
