import path from 'node:path'
import fsp from 'node:fs/promises'
import { existsSync } from 'node:fs'
import process from 'node:process'

// ------------------------------------------------- //
// -------- Common Path for Application ------------ //
// ------------------------------------------------- //
export const rootPath = process.cwd()
export const srcPath = path.join(rootPath, 'src')
export const appModulesPath = path.join(rootPath, 'node_modules')
export const appPackagePath = path.join(rootPath, 'package.json')
export const buildResourcePath = path.join(rootPath, 'buildResources')
export const outputPath = path.join(rootPath, 'out')
export const outputAppPath = path.join(outputPath, 'app')
export const outputDistPath = path.join(outputPath, 'out-dist')

export const IS_DEV = !!process.env.NATMRI_DEV
export const IS_TEST = !!process.env.NATMRI_TEST

// ---------- Package Mate Infomation -------------- //
// ------------------------------------------------- //
export const MATE = {
  year: 2022,
}

// ------------------------------------------------ //
// ---------- Mark File Information --------------- //
// ------------------------------------------------ //
export interface IMarkFile {
  name: string | RegExp
  ext?: string[]
  type?: 'dir' | 'file'
}
export const files: IMarkFile[] = [
  {
    name: 'readme',
    ext: [
      'md',
      'markdown',
      'html',
      'txt',
    ],
  },
  {
    name: 'license',
    ext: [
      'html',
      'md',
      'txt',
    ],
  },
  {
    name: 'changelog',
    ext: [
      'md',
      'html',
    ],
  },
  {
    name: 'history',
    ext: [
      'md',
      'html',
    ],
  },
  {
    name: 'security',
    ext: [
      'md',
      'html',
      'txt',
    ],
  },
  {
    name: '.github',
    type: 'dir',
  },
  {
    name: 'CONTRIBUTING',
    ext: [
      'md',
      'html',
    ],
  },
  {
    name: 'GOVERNANCE',
    ext: [
      'md',
      'html',
    ],
  },
  {
    name: '.travis',
    ext: [
      'yml',
      'yaml',
    ],
  },
  {
    name: 'authors?',
    ext: [
      'md',
      'txt',
      'html',
    ],
  },
  {
    name: 'test',
    type: 'dir',
  },
  {
    name: 'examples?',
    type: 'dir',
  },
  {
    name: '.circleci',
    type: 'dir',
  },
]

// ----------------------------------------------- //
// --------- Resolve Options Information --------- //
// ----------------------------------------------- //
export async function rimraf(path: string): Promise<void> {
  try {
    if (!existsSync(path))
      return

    await fsp.rm(path, { recursive: true, force: true })

    console.log(`\x1B[91m Remove\x1B[0m\x1B[96m\x1B[1m ${path}\x1B[0m successfully`)
  }
  catch (error) {
    console.error(`\x1B[91m\x1B[1m Remove ${path} failed \x1B[0m, error: ${error}`)
  }
}

export async function rimrafTasks(paths: string[]) {
  const result: Promise<void>[] = []

  for (const task of paths)
    result.push(rimraf(task))

  return Promise.allSettled(result)
}

export async function linkModules(target: string, dest: string) {
  await fsp.symlink(target, dest, 'junction')
}

export async function linkPackageFile(target: string, dest: string) {
  await fsp.symlink(target, dest, 'file')
}
