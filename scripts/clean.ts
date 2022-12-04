import { join, sep } from 'path'
import fs from 'fs-extra'
import nodeAbi from 'node-abi'
import markFiles from './markFiles.json'
import { appModulesPath, appPackagePath, appPath, releasePath, rimraf, sequence, taskFactory } from './utils'

export const cleanBuildProduct = async () => {
  const tasks = taskFactory([
    join(appPath, 'dist'),
    join(releasePath, 'build'),
  ])

  await Promise.allSettled(tasks)
}

export const cleanNativeModule = async () => {
  const tasks: Promise<void>[] = []
  let mode: 'sequence' | 'parallel' = 'sequence'
  const { devDependencies } = JSON.parse(fs.readFileSync(appPackagePath, 'utf-8'))

  const nativeModules = fs.readdirSync(appModulesPath, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== '.pnpm')
    .map(d => d.name)
    .map((d) => {
      if (!d.includes('@'))
        return d

      return fs.readdirSync(join(appModulesPath, d), { withFileTypes: true })
        .filter(dd => dd.isDirectory())
        .map(dd => join(d, dd.name))
    })
    .flat(3)
    .filter(d => fs.existsSync(join(appModulesPath, d, 'binding.gyp')))

  nativeModules.forEach(async (module) => {
    const p = join(appModulesPath, module)
    const binPath = join(p, 'bin')
    const buildPath = join(p, 'build')
    const releasePath = join(buildPath, 'Release')
    const depsPath = join(buildPath, 'deps')

    tasks.push(rimraf(join(p, 'deps')))

    if (fs.existsSync(binPath)) {
      const abi = nodeAbi.getAbi(/\d/.test(devDependencies.electron[0]) ? devDependencies.electron : devDependencies.electron.slice(1), 'electron')

      if (fs.existsSync(join(binPath, `${process.platform}-${process.arch}-${abi}`)))
        tasks.push(rimraf(buildPath))

      tasks.push(fs.mkdir(buildPath))
      const m = module.split(sep)
      tasks.push(fs.copyFile(join(binPath, `${process.platform}-${process.arch}-${abi}`, `${m[m.length - 1]}.node`), join(buildPath, `${m[m.length - 1]}.node`)))
      tasks.push(rimraf(binPath))
      tasks.push(rimraf(depsPath))

      mode = 'sequence'

      return
    }

    if (!fs.existsSync(join(p, 'build')) || !fs.existsSync(releasePath))
      return

    const des = fs.readdirSync(releasePath)

    tasks.push(rimraf(depsPath))

    tasks.push(...taskFactory(des.map((de) => {
      if (!de.endsWith('.node'))
        return join(releasePath, de)

      return null
    })))

    mode = 'parallel'
  })
  if (mode === 'sequence')
    await sequence(tasks)
  else
    await Promise.all(tasks)
}

export const cleanFiles = async () => {
  interface IMarkFile {
    name: string | RegExp
    ext?: string[]
    type?: 'dir' | 'file'
  }

  const markedFiles: string[] = []
  const files: IMarkFile[] = markFiles as IMarkFile[]

  const findMarkedFile = (p: string, markFile: IMarkFile): string | null => {
    if (!markFile.ext)
      markFile.ext = []
    if (!markFile.type)
      markFile.type = 'file'
    markFile.ext.push('')
    const files = fs.readdirSync(p, { withFileTypes: true }).filter(Boolean)

    for (const file of files) {
      for (const ext of markFile.ext) {
        if (
          (file.isDirectory() && markFile.type !== 'dir')
          || (file.isFile() && markFile.type !== 'file')
        )
          break

        const regexp = new RegExp(`${markFile.name}${!ext ? ext : ext.startsWith('.') ? ext : `.${ext}`}\$`, 'ig')
        if (file.name.match(regexp))
          return join(p, file.name)
      }
    }

    return null
  }

  const modules = fs.readdirSync(appModulesPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .filter(Boolean)
    .map(d => join(appModulesPath, d.name))

  for (const file of files) {
    modules.forEach((module) => {
      const markFile = findMarkedFile(module, file)

      if (markFile)
        markedFiles.push(markFile)
    })
  }

  await Promise.allSettled(taskFactory(markedFiles))
}
