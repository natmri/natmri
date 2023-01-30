import path from 'node:path'
import fsp from 'node:fs/promises'
import _rimraf from 'rimraf'
import yaml from 'yaml'

// ------------------------------------------------- //
// -------- Common Path for Application ------------ //
// ------------------------------------------------- //
export const rootPath = process.cwd().includes('app') ? path.resolve(process.cwd(), '../') : process.cwd()
export const srcPath = path.join(rootPath, 'src')
export const srcModulesPath = path.join(srcPath, 'node_modules')
export const srcPackagePath = path.join(srcPath, 'package.json')
export const srcTsConfigPath = path.join(srcPath, 'tsconfig.json')
export const appPath = path.join(rootPath, 'app')
export const appModulesPath = path.join(appPath, 'node_modules')
export const appPackagePath = path.join(appPath, 'package.json')
export const buildResourcePath = path.join(rootPath, 'buildResources')
export const outputPath = path.join(rootPath, 'out-build')
export const outputAppPath = path.join(outputPath, 'app')
export const outputDistPath = path.join(outputAppPath, 'out')
export const outputPackagePath = path.join(outputAppPath, 'package.json')
export const outputModulePath = path.join(outputAppPath, 'node_modules')

export const IS_DEV = !!process.env.NATMRI_DEV
export const IS_TEST = !!process.env.NATMRI_TEST

// ------------------------------------------------- //
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
interface ResolveOptions {
  alias?: Record<string, string>
}
const alias: Record<string, string> = {
  natmri: path.join(rootPath, './src/natmri'),
}
export const resolve: ResolveOptions = {
  alias,
}

export async function rimraf(path: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    _rimraf(path, (error: any) => {
      if (error) {
        console.error(`\x1B[91m\x1B[1m Remove ${path} failed \x1B[0m, error: ${error}`)
        reject(error)
      }

      console.log(`\x1B[91m Remove\x1B[0m\x1B[96m\x1B[1m ${path}\x1B[0m successfully`)
      resolve()
    })
  })
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

export async function setupPackageEnvironemt(extraTasks: (Promise<void> | (() => Promise<void>))[] = []) {
  await Promise.all([
    // copy app/.npmrc to out-build
    fsp.cp(path.join(appPath, '.npmrc'), path.join(outputAppPath, '.npmrc'), { force: true }),
    // copy app/package.json to out-build
    fsp.cp(appPackagePath, outputPackagePath, { force: true }),
    async () => {
      // copy app/node_module to out-build
      await fsp.cp(appModulesPath, outputModulePath, { force: true, recursive: true })
      // rewrite virtual store dir
      return fsp.readFile(path.join(outputModulePath, '.modules.yaml'), 'utf8')
        .then((modulesContent) => {
          const modules = yaml.parse(modulesContent)
          modules.virtualStoreDir = path.join(outputModulePath, '.pnpm')
          return modules
        })
        .then(modules => fsp.writeFile(path.join(outputModulePath, '.modules.yaml'), yaml.stringify(modules), 'utf8'))
    },
    ...extraTasks,
  ])
}

export async function setupDevelopmentEnvironment(extraTasks: (Promise<void> | (() => Promise<void>))[] = []) {
  if (!IS_DEV)
    return

  await fsp.mkdir(outputPath)
  await fsp.mkdir(outputAppPath)

  await Promise.all([
    linkModules(appModulesPath, outputModulePath),
    linkPackageFile(appPackagePath, outputPackagePath),
    ...extraTasks,
  ])
}
