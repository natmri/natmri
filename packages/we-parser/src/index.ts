import fs from 'node:fs'
import type { Buffer } from 'node:buffer'

export interface IReader {
  read(bytes: number): Buffer
}

export interface PackageEntry {
  filename: string
  offset: number
  length: number
}

export interface FileEntry {
  length: number
  data: Buffer
}

export class BufferReader implements IReader {
  private pos = 0

  constructor(private buffer: Buffer) { }

  read(bytes: number): Buffer {
    const result = this.buffer.subarray(this.pos, this.pos + bytes)
    this.pos += result.byteLength
    return result
  }
}

export class WEParser {
  #buffer!: BufferReader
  #files!: FileEntry[]
  #packages!: PackageEntry[]

  get files(): FileEntry[] {
    return this.#files
  }

  get packages(): PackageEntry[] {
    return this.#packages
  }

  parse(filepath: string) {
    if (!fs.existsSync(filepath))
      return
    this.#buffer = new BufferReader(fs.readFileSync(filepath))
  }

  readSizedString() {
    const length = this.#buffer.read(4).readUInt32LE()
    return this.#buffer.read(length).toString('utf8')
  }

  validateHeader() {
    const header = this.readSizedString()

    if (!header.startsWith('PKGV'))
      throw new Error('Invalid header')
  }

  loadFiles() {
    const count = this.#buffer.read(4).readUInt32LE()
    const packages: PackageEntry[] = []
    const files: FileEntry[] = []

    for (let i = 0; i < count; i++) {
      const filename = this.readSizedString()
      const offset = this.#buffer.read(4).readUInt32LE()
      const length = this.#buffer.read(4).readUInt32LE()

      packages.push({
        filename,
        offset,
        length,
      })
    }

    for (const entry of packages) {
      const content = this.#buffer.read(entry.length)
      files.push({
        length: entry.length,
        data: content,
      })
    }

    this.#packages = packages
    this.#files = files
  }
}
