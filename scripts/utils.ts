import { promisify } from 'node:util'
import path from 'node:path'
import fsp from 'node:fs/promises'
import rm from 'rimraf'

export const rootPath = process.cwd().includes('app') ? path.resolve(process.cwd(), '../') : process.cwd()

export const srcElectronPath = path.join(rootPath, 'src')
export const srcElectronModulesPath = path.join(srcElectronPath, 'node_modules')
export const srcElectronPackagePath = path.join(srcElectronPath, 'package.json')
export const appPath = path.join(rootPath, 'app')
export const appModulesPath = path.join(appPath, 'node_modules')
export const appPackagePath = path.join(appPath, 'package.json')
export const buildResourcePath = path.join(rootPath, 'buildResources')
export const outputPath = path.join(rootPath, 'out-build')
export const outputAppPath = path.join(outputPath, 'app')
export const outputDistPath = path.join(outputAppPath, 'dist')
export const outputPackagePath = path.join(outputAppPath, 'package.json')
export const outputModulePath = path.join(outputAppPath, 'node_modules')

const alias: Record<string, string> = {
  natmri: path.join(rootPath, './src/natmri'),
}

export const resolve: {
  alias?: Record<string, string>
} = {
  alias,
}

const internalRimraf = promisify(rm)

export const rimraf = async function remove(path: string): Promise<void> {
  try {
    await internalRimraf(path)
    console.log(`\x1B[91m Remove\x1B[0m\x1B[96m\x1B[1m ${path}\x1B[0m successfully`)
  }
  catch (err) {
    console.error(`\x1B[91m\x1B[1m Remove ${path} failed \x1B[0m, error: ${err}`)
  }
}

export function taskFactory(paths: (string | null)[]) {
  const r: Promise<void>[] = []

  for (const task of paths) {
    if (task)
      r.push(rimraf(task))
  }

  return r
}

export async function linkModules(target: string, dest: string) {
  await fsp.symlink(target, dest, 'junction')
}

export async function linkPackageFile(target: string, dest: string) {
  await fsp.symlink(target, dest, 'file')
}

export async function sequence<T>(promiseFactories: Promise<T>[]): Promise<T[]> {
  const results: T[] = []
  let index = 0
  const len = promiseFactories.length

  function next(): Promise<T> | null {
    return index < len ? promiseFactories[index++] : null
  }

  async function thenHandler(result: any): Promise<any> {
    if (result !== undefined && result !== null)
      results.push(result)

    const n = next()
    if (n)
      return n.then(thenHandler)

    return results
  }

  return thenHandler(null)
}
