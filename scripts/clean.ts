import { join, sep } from 'node:path'
import fs, { promises as fsp } from 'node:fs'
import markFiles from './markFiles.json'
import { appModulesPath, appPackagePath, appPath, rimraf, rootPath, sequence, taskFactory } from './utils'

export const cleanBuildProduct = async () => {
  const tasks = taskFactory([
    join(rootPath, 'out-build'),
  ])

  await Promise.allSettled(tasks)
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
