// auto patch `tsconfig.json` path options from alias.ts
import { join, relative } from 'node:path'
import { exec } from 'node:child_process'
import fs from 'fs-extra'
import consola from 'consola'
import format from 'json-format'
import { alias } from '../alias'
import { rootPath } from './utils'

const configPaths = process.argv.slice(2)
const normalizeConfigPaths = configPaths.map(p => join(p, '..'))
const r: Record<string, Record<string, string[]>> = {}
const aliasKeys = Object.keys(alias)

for (let i = 0; i < configPaths.length; i++) {
  const p = normalizeConfigPaths[i]
  const target: Record<string, string[]> = {}
  for (const key of aliasKeys) {
    const value = alias[key]

    target[key] = [
      process.platform === 'win32' ? relative(p, value).replace(/\\/g, '/') : relative(p, value),
    ]
  }
  r[configPaths[i]] = target
}

for (const key of Object.keys(r)) {
  const value = r[key]
  // read
  const tsconfig = fs.readJSONSync(join(rootPath, key))
  // diff merge
  if (!tsconfig.compilerOptions.paths)
    tsconfig.compilerOptions.paths = {}
  for (const pathKey of Object.keys(value)) {
    if (tsconfig.compilerOptions.paths[pathKey])
      continue

    tsconfig.compilerOptions.paths[pathKey] = value[pathKey]
  }
  fs.writeFileSync(join(rootPath, key), format(tsconfig))
}

exec('eslint . --fix --ext .json')
  .once('error', err => consola.error(err))
  .once('exit', () => consola.info('complete patch alias!'))
