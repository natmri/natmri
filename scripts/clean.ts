import { join } from 'node:path'
import fs from 'node:fs'
import type { IMarkFile } from './utils'
import { appModulesPath, files, outputPath, rimrafTasks } from './utils'

export const cleanBuildProduct = async () => {
  await rimrafTasks([
    outputPath,
  ])
}

export const cleanFiles = async () => {
  const markedFiles: string[] = []

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

  await rimrafTasks(markedFiles)
}
