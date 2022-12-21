import { basename, extname, join, relative } from 'node:path'
import { createCancelablePromise } from '@livemoe/utils'
import fs from 'fs-extra'
import { IMAGE_EXTS, VIDEO_EXTS, ZIP_EXTS } from 'natmri/base/common/constants'
import type { IExtractOptions, IFile } from 'natmri/base/node/zip'
import { extract, pack } from 'natmri/base/node/zip'

export enum FileOperationErrorType {
  NOT_FOUNT,
  EXT_NOT_MATCH,
  TYPE_NOT_MATCH,
}

export class FileError extends Error {
  readonly type: FileOperationErrorType | undefined
  readonly cause: Error

  constructor(type: FileOperationErrorType | undefined, cause: Error) {
    let message = cause.message

    switch (type) {
      case FileOperationErrorType.NOT_FOUNT:
        message = `File NOT FOUNT: ${message}`
        break
      case FileOperationErrorType.EXT_NOT_MATCH:
        message = `File extension not match: ${message}`
        break
      case FileOperationErrorType.TYPE_NOT_MATCH:
        message = `File type not match: ${message}`
        break
    }

    super(message)
    this.type = type
    this.cause = cause
  }
}

export function is(filepath: string[], type: 'file' | 'directory', extensions?: string | string[]): boolean[]
export function is(filepath: string, type: 'file' | 'directory', extensions?: string | string[]): boolean
export function is(filepath: string | string[], type: 'file' | 'directory', exts?: string | string[]): boolean | boolean[] {
  if (Array.isArray(filepath)) {
    const result: boolean[] = []

    for (const path of filepath)
      result.push(is(path, type, exts))

    return result
  }
  else {
    const stat = fs.statSync(filepath)

    switch (type) {
      case 'file':
        if (Array.isArray(exts)) {
          const result: boolean[] = []

          for (const ext of exts)
            result.push(stat.isFile() && filepath.endsWith(ext))

          return result.some(Boolean)
        }
        else if (exts) {
          return stat.isFile() && filepath.endsWith(exts)
        }
        else {
          return stat.isFile()
        }
      case 'directory':
        return stat.isDirectory()
      default:
        return false
    }
  }
}

export function pathExistsSync(filepath: string) {
  return fs.pathExistsSync(filepath)
}

export function pathExists(filepath: string) {
  return fs.pathExists(filepath)
}

export function isVideo(filepath: string) {
  return is(filepath, 'file', VIDEO_EXTS)
}

export function isZip(filepath: string) {
  return is(filepath, 'file', ZIP_EXTS)
}

export function isImage(filepath: string) {
  return is(filepath, 'file', IMAGE_EXTS)
}

export function isDirectory(filepath: string) {
  return fs.statSync(filepath, { bigint: true }).isDirectory()
}

export function isFile(filepath: string) {
  return fs.statSync(filepath, { bigint: true }).isFile()
}

export function getFileInfo(filepath: string) {
  return fs.statSync(filepath)
}

export async function zip(filepath: string, zippath: string) {
  if (!pathExistsSync(filepath))
    throw new FileError(FileOperationErrorType.NOT_FOUNT, new Error(`file path: ${filepath}`))

  const files: IFile[] = []

  if (isFile(filepath)) {
    const file: IFile = {
      localPath: filepath,
      path: basename(filepath),
    }
    files.push(file)
  }
  else {
    let _files = await readdir(filepath)

    _files = _files.map<IFile>(file => ({
      localPath: file.path,
      path: relative(filepath, file.path),
    }))

    files.push(..._files)
  }

  const cancelablePromise = createCancelablePromise((token) => {
    token.onCancellationRequested(() => {
      if (!pathExistsSync(zippath))
        return

      return fs.unlink(zippath)
    })

    return pack(zippath, files)
  })

  return cancelablePromise
}

export async function readdir(filepath: string): Promise<IFile[]> {
  const directory = await fs.readdir(filepath, { withFileTypes: true })
  const files: IFile[] = []

  for (const file of directory) {
    if (file.isFile()) {
      files.push({
        path: join(filepath, file.name),
        localPath: join(filepath, file.name),
      })
    }

    if (file.isDirectory()) {
      const _files = await readdir(join(filepath, file.name))

      files.push(..._files)
    }
  }

  return files
}

export async function unzip(zippath: string, targetpath: string, options?: IExtractOptions) {
  if (!pathExistsSync(zippath))
    throw new FileError(FileOperationErrorType.NOT_FOUNT, new Error(`file path: ${zippath}`))
  if (!isFile(zippath))
    throw new FileError(FileOperationErrorType.TYPE_NOT_MATCH, new Error('incorrect file type. it\'s must be input file that received directory'))
  if (!isZip(zippath))
    throw new FileError(FileOperationErrorType.EXT_NOT_MATCH, new Error(`incorrect file extension as ${extname(zippath)}`))

  const cancelablePromise = createCancelablePromise((token) => {
    return extract(zippath, targetpath, options ?? { }, token)
  })

  return cancelablePromise
}
