/**
 * TODO list:
 *  - [ ] progress event
 *  - [ ] comment
 *  - [ ] rewrite yauzl module
 */

import { PassThrough, Transform } from 'node:stream'
import type { ReadStream } from 'node:fs'
import fs from 'node:fs'
import EventEmitter from 'node:events'
import type { TransformCallback } from 'node:stream'
import zlib from 'node:zlib'
import { Buffer } from 'node:buffer'

// #region magic number
const MAX_BUFFER_LENGTH = 0x3FFFFFFF
const ZIP64_END_OF_CENTRAL_DIRECTORY_RECORD_SIZE = 56
const ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIZE = 20
const END_OF_CENTRAL_DIRECTORY_RECORD_SIZE = 22
const LOCAL_FILE_HEADER_FIXED_SIZE = 30
const VERSION_NEEDED_TO_EXTRACT_UTF8 = 20
const VERSION_NEEDED_TO_EXTRACT_ZIP64 = 45
// 3 = unix. 63 = spec version 6.3
const VERSION_MADE_BY = (3 << 8) | 63
const FILE_NAME_IS_UTF8 = 1 << 11
const UNKNOWN_CRC32_AND_FILE_SIZES = 1 << 3
const DATA_DESCRIPTOR_SIZE = 16
const ZIP64_DATA_DESCRIPTOR_SIZE = 24
const CENTRAL_DIRECTORY_RECORD_FIXED_SIZE = 46
const ZIP64_EXTENDED_INFORMATION_EXTRA_FIELD_SIZE = 28

// #endregion

const eocdrSignatureBuffer = Buffer.from([0x50, 0x4B, 0x05, 0x06])

interface Options {
  mtime: Date
  mode: number
  compress: boolean
  forceZip64Format: boolean
}

interface ReadStreamOptions extends Options {
  size: number
}

interface DirectoryOptions {
  mtime: Date
  mode: number
}

interface EndOptions {
  comment: string | Buffer
  forceZip64Format: boolean
}

function writeUInt64LE(destination: Buffer, value: number, offset: number) {
  // can't use bitshift here, because JavaScript only allows bitshifting on 32-bit integers.
  const high = Math.floor(value / 0x100000000)
  const low = value % 0x100000000
  destination.writeUInt32LE(low, offset)
  destination.writeUInt32LE(high, offset + 4)
}

function validateMetadataPath(metadataPath: string, isDirectory: boolean) {
  if (metadataPath === '')
    throw new Error('empty metadataPath')
  metadataPath = metadataPath.replace(/\\/g, '/')
  if (/^[a-zA-Z]:/.test(metadataPath) || /^\//.test(metadataPath))
    throw new Error(`absolute path: ${metadataPath}`)
  if (metadataPath.split('/').includes('..'))
    throw new Error(`invalid relative path: ${metadataPath}`)
  const looksLikeDirectory = /\/$/.test(metadataPath)
  if (isDirectory) {
    // append a trailing '/' if necessary.
    if (!looksLikeDirectory)
      metadataPath += '/'
  }
  else {
    if (looksLikeDirectory)
      throw new Error(`file path cannot end with '/': ${metadataPath}`)
  }
  return metadataPath
}

function dateToDosDateTime(jsDate: Date) {
  let date = 0
  date |= jsDate.getDate() & 0x1F // 1-31
  date |= ((jsDate.getMonth() + 1) & 0xF) << 5 // 0-11, 1-12
  date |= ((jsDate.getFullYear() - 1980) & 0x7F) << 9 // 0-128, 1980-2108

  let time = 0
  time |= Math.floor(jsDate.getSeconds() / 2) // 0-59, 0-29 (lose odd numbers)
  time |= (jsDate.getMinutes() & 0x3F) << 5 // 0-59
  time |= (jsDate.getHours() & 0x1F) << 11 // 0-23

  return { date, time }
}

export class ZipFile extends EventEmitter {
  outputStream = new PassThrough()
  entries: Entry[] = []
  outputStreamCursor = 0
  ended = false
  allDone = false
  forceZip64Eocd = false
  comment: Buffer = Buffer.allocUnsafe(0)
  offsetOfStartOfCentralDirectory = 0
  finalSizeCallback: any

  addFile(realPath: string, metadataPath: string, options: Partial<Options> = {}) {
    metadataPath = validateMetadataPath(metadataPath, false)
    const entry = new Entry(metadataPath, false, options)
    this.entries.push(entry)
    fs.stat(realPath, (err, stats) => {
      if (err)
        return this.emit('error', err)
      if (!stats.isFile())
        return this.emit('error', new Error(`not a file: ${realPath}`))
      entry.uncompressedSize = stats.size
      if (!options.mtime)
        entry.setLastModDate(stats.mtime)
      if (!options.mode)
        entry.setFileAttributesMode(stats.mode)

      entry.setFileDataPumpFunction(() => {
        const readStream = fs.createReadStream(realPath)
        entry.state = Entry.FILE_DATA_IN_PROGRESS
        readStream.on('error', (err) => {
          this.emit('error', err)
        })
        this.pumpFileDataReadStream(entry, readStream)
      })
      this.pumpEntries()
    })
  }

  addReadStream(readStream: ReadStream, metadataPath: string, options: Partial<ReadStreamOptions> = {}) {
    metadataPath = validateMetadataPath(metadataPath, false)
    const entry = new Entry(metadataPath, false, options)
    this.entries.push(entry)
    entry.setFileDataPumpFunction(() => {
      entry.state = Entry.FILE_DATA_IN_PROGRESS
      this.pumpFileDataReadStream(entry, readStream)
    })
    this.pumpEntries()
  }

  addBuffer(buffer: Buffer, metadataPath: string, options: Partial<Options> = {}) {
    metadataPath = validateMetadataPath(metadataPath, false)
    if (buffer.length > MAX_BUFFER_LENGTH)
      throw new Error(`buffer too large: ${buffer.length} > ${0x3FFFFFFF}`)
    const entry = new Entry(metadataPath, false, options)
    entry.uncompressedSize = buffer.length
    entry.crc32 = crc32.unsigned(buffer)
    entry.crcAndFileSizeKnown = true
    this.entries.push(entry)

    const setCompressedBuffer = (compressedBuffer: Buffer) => {
      entry.compressedSize = compressedBuffer.length
      entry.setFileDataPumpFunction(() => {
        this.writeToOutputStream(compressedBuffer)
        this.writeToOutputStream(entry.getDataDescriptor())
        entry.state = Entry.FILE_DATA_DONE

        // don't call pumpEntries() recursively.
        // (also, don't call process.nextTick recursively.)
        setImmediate(() => {
          this.pumpEntries()
        })
      })
      this.pumpEntries()
    }

    if (!entry.compress) {
      setCompressedBuffer(buffer)
    }
    else {
      zlib.deflateRaw(buffer, (_, compressedBuffer) => {
        setCompressedBuffer(compressedBuffer)
      })
    }
  }

  addEmptyDirectory(metadataPath: string, options: Partial<DirectoryOptions> = {}) {
    metadataPath = validateMetadataPath(metadataPath, true)
    const entry = new Entry(metadataPath, true, options)
    this.entries.push(entry)

    entry.setFileDataPumpFunction(() => {
      this.writeToOutputStream(entry.getDataDescriptor())
      entry.state = Entry.FILE_DATA_DONE
      this.pumpEntries()
    })
    this.pumpEntries()
  }

  end(): void
  end(options?: EndOptions, finalSizeCallback?: () => void): void
  end(options?: EndOptions, finalSizeCallback?: () => void) {
    if (typeof options === 'function')
      finalSizeCallback = options

    if (this.ended)
      return
    this.ended = true
    this.finalSizeCallback = finalSizeCallback
    this.forceZip64Eocd = (options && !!options.forceZip64Format) ?? false

    if (options && options.comment) {
      if (typeof options.comment === 'string') {
        this.comment = encodeCp437(options.comment)
      }
      else {
        // It should be a Buffer
        this.comment = options.comment
      }
      if (this.comment.length > 0xFFFF)
        throw new Error('comment is too large')
        // gotta check for this, because the zipfile format is actually ambiguous.
      if (this.comment.includes(eocdrSignatureBuffer))
        throw new Error('comment contains end of central directory record signature')
    }
  }

  private pumpFileDataReadStream(entry: Entry, readStream: ReadStream) {
    const crc32Watcher = new Crc32Watcher()
    const uncompressedSizeCounter = new ByteCounter()
    const compressor = entry.compress ? zlib.createDeflateRaw() : new PassThrough()
    const compressedSizeCounter = new ByteCounter()
    readStream.pipe(crc32Watcher)
      .pipe(uncompressedSizeCounter)
      .pipe(compressor)
      .pipe(compressedSizeCounter)
      .pipe(this.outputStream, { end: false })
    compressedSizeCounter.on('end', () => {
      entry.crc32 = crc32Watcher.crc32
      if (entry.uncompressedSize == null)
        entry.uncompressedSize = uncompressedSizeCounter.byteCount

      else
        if (entry.uncompressedSize !== uncompressedSizeCounter.byteCount)
          return this.emit('error', new Error('file data stream has unexpected number of bytes'))

      entry.compressedSize = compressedSizeCounter.byteCount
      this.outputStreamCursor += entry.compressedSize
      this.writeToOutputStream(entry.getDataDescriptor())
      entry.state = Entry.FILE_DATA_DONE
      this.pumpEntries()
    })
  }

  private pumpEntries() {
    if (this.allDone)
      return
      // first check if finalSize is finally known
    if (this.ended && this.finalSizeCallback != null) {
      const finalSize = this.calculateFinalSize()
      if (finalSize != null) {
        // we have an answer
        this.finalSizeCallback(finalSize)
        this.finalSizeCallback = null
      }
    }

    const getFirstNotDoneEntry = () => {
      for (let i = 0; i < this.entries.length; i++) {
        const entry = this.entries[i]
        if (entry.state < Entry.FILE_DATA_DONE)
          return entry
      }
      return null
    }

    // pump entries
    const entry = getFirstNotDoneEntry()

    if (entry != null) {
      // this entry is not done yet
      if (entry.state < Entry.READY_TO_PUMP_FILE_DATA)
        return // input file not open yet
      if (entry.state === Entry.FILE_DATA_IN_PROGRESS)
        return // we'll get there
        // start with local file header
      entry.relativeOffsetOfLocalHeader = this.outputStreamCursor
      const localFileHeader = entry.getLocalFileHeader()
      this.writeToOutputStream(localFileHeader)
      entry.doFileDataPump()
    }
    else {
      // all cought up on writing entries
      if (this.ended) {
        // head for the exit
        this.offsetOfStartOfCentralDirectory = this.outputStreamCursor
        this.entries.forEach((entry) => {
          const centralDirectoryRecord = entry.getCentralDirectoryRecord()
          this.writeToOutputStream(centralDirectoryRecord)
        })
        this.writeToOutputStream(this.getEndOfCentralDirectoryRecord() as Buffer)
        this.outputStream.end()
        this.allDone = true
      }
    }
  }

  private writeToOutputStream(buffer: Buffer) {
    this.outputStream.write(buffer)
    this.outputStreamCursor += buffer.length
  }

  private calculateFinalSize() {
    let pretendOutputCursor = 0
    let centralDirectorySize = 0
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i]
      // compression is too hard to predict
      if (entry.compress)
        return -1
      if (entry.state >= Entry.READY_TO_PUMP_FILE_DATA) {
        // if addReadStream was called without providing the size, we can't predict the final size
        if (entry.uncompressedSize == null)
          return -1
      }
      else {
        // if we're still waiting for fs.stat, we might learn the size someday
        if (entry.uncompressedSize == null)
          return null
      }
      // we know this for sure, and this is important to know if we need ZIP64 format.
      entry.relativeOffsetOfLocalHeader = pretendOutputCursor
      const useZip64Format = entry.useZip64Format()

      pretendOutputCursor += LOCAL_FILE_HEADER_FIXED_SIZE + entry.utf8FileName.length
      pretendOutputCursor += entry.uncompressedSize
      if (!entry.crcAndFileSizeKnown) {
        // use a data descriptor
        if (useZip64Format)
          pretendOutputCursor += ZIP64_DATA_DESCRIPTOR_SIZE

        else
          pretendOutputCursor += DATA_DESCRIPTOR_SIZE
      }

      centralDirectorySize += CENTRAL_DIRECTORY_RECORD_FIXED_SIZE + entry.utf8FileName.length + entry.fileComment.length
      if (useZip64Format)
        centralDirectorySize += ZIP64_EXTENDED_INFORMATION_EXTRA_FIELD_SIZE
    }

    let endOfCentralDirectorySize = 0
    if (this.forceZip64Eocd
      || this.entries.length >= 0xFFFF
      || centralDirectorySize >= 0xFFFF
      || pretendOutputCursor >= 0xFFFFFFFF) {
      // use zip64 end of central directory stuff
      endOfCentralDirectorySize += ZIP64_END_OF_CENTRAL_DIRECTORY_RECORD_SIZE + ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIZE
    }
    endOfCentralDirectorySize += END_OF_CENTRAL_DIRECTORY_RECORD_SIZE + this.comment.length
    return pretendOutputCursor + centralDirectorySize + endOfCentralDirectorySize
  }

  private getEndOfCentralDirectoryRecord(actuallyJustTellMeHowLongItWouldBe?: any) {
    let needZip64Format = false
    let normalEntriesLength = this.entries.length
    if (this.forceZip64Eocd || this.entries.length >= 0xFFFF) {
      normalEntriesLength = 0xFFFF
      needZip64Format = true
    }
    const sizeOfCentralDirectory = this.outputStreamCursor - this.offsetOfStartOfCentralDirectory
    let normalSizeOfCentralDirectory = sizeOfCentralDirectory
    if (this.forceZip64Eocd || sizeOfCentralDirectory >= 0xFFFFFFFF) {
      normalSizeOfCentralDirectory = 0xFFFFFFFF
      needZip64Format = true
    }
    let normalOffsetOfStartOfCentralDirectory = this.offsetOfStartOfCentralDirectory
    if (this.forceZip64Eocd || this.offsetOfStartOfCentralDirectory >= 0xFFFFFFFF) {
      normalOffsetOfStartOfCentralDirectory = 0xFFFFFFFF
      needZip64Format = true
    }
    if (actuallyJustTellMeHowLongItWouldBe) {
      if (needZip64Format) {
        return (
          ZIP64_END_OF_CENTRAL_DIRECTORY_RECORD_SIZE
          + ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIZE
          + END_OF_CENTRAL_DIRECTORY_RECORD_SIZE
        )
      }
      else {
        return END_OF_CENTRAL_DIRECTORY_RECORD_SIZE
      }
    }

    const eocdrBuffer = Buffer.alloc(END_OF_CENTRAL_DIRECTORY_RECORD_SIZE + this.comment.length)
    // end of central dir signature                       4 bytes  (0x06054b50)
    eocdrBuffer.writeUInt32LE(0x06054B50, 0)
    // number of this disk                                2 bytes
    eocdrBuffer.writeUInt16LE(0, 4)
    // number of the disk with the start of the central directory  2 bytes
    eocdrBuffer.writeUInt16LE(0, 6)
    // total number of entries in the central directory on this disk  2 bytes
    eocdrBuffer.writeUInt16LE(normalEntriesLength, 8)
    // total number of entries in the central directory   2 bytes
    eocdrBuffer.writeUInt16LE(normalEntriesLength, 10)
    // size of the central directory                      4 bytes
    eocdrBuffer.writeUInt32LE(normalSizeOfCentralDirectory, 12)
    // offset of start of central directory with respect to the starting disk number  4 bytes
    eocdrBuffer.writeUInt32LE(normalOffsetOfStartOfCentralDirectory, 16)
    // .ZIP file comment length                           2 bytes
    eocdrBuffer.writeUInt16LE(this.comment.length, 20)
    // .ZIP file comment                                  (variable size)
    this.comment.copy(eocdrBuffer, 22)

    if (!needZip64Format)
      return eocdrBuffer

    // ZIP64 format
    // ZIP64 End of Central Directory Record
    const zip64EocdrBuffer = Buffer.alloc(ZIP64_END_OF_CENTRAL_DIRECTORY_RECORD_SIZE)
    // zip64 end of central dir signature                                             4 bytes  (0x06064b50)
    zip64EocdrBuffer.writeUInt32LE(0x06064B50, 0)
    // size of zip64 end of central directory record                                  8 bytes
    writeUInt64LE(zip64EocdrBuffer, ZIP64_END_OF_CENTRAL_DIRECTORY_RECORD_SIZE - 12, 4)
    // version made by                                                                2 bytes
    zip64EocdrBuffer.writeUInt16LE(VERSION_MADE_BY, 12)
    // version needed to extract                                                      2 bytes
    zip64EocdrBuffer.writeUInt16LE(VERSION_NEEDED_TO_EXTRACT_ZIP64, 14)
    // number of this disk                                                            4 bytes
    zip64EocdrBuffer.writeUInt32LE(0, 16)
    // number of the disk with the start of the central directory                     4 bytes
    zip64EocdrBuffer.writeUInt32LE(0, 20)
    // total number of entries in the central directory on this disk                  8 bytes
    writeUInt64LE(zip64EocdrBuffer, this.entries.length, 24)
    // total number of entries in the central directory                               8 bytes
    writeUInt64LE(zip64EocdrBuffer, this.entries.length, 32)
    // size of the central directory                                                  8 bytes
    writeUInt64LE(zip64EocdrBuffer, sizeOfCentralDirectory, 40)
    // offset of start of central directory with respect to the starting disk number  8 bytes
    writeUInt64LE(zip64EocdrBuffer, this.offsetOfStartOfCentralDirectory, 48)
    // zip64 extensible data sector                                                   (variable size)
    // nothing in the zip64 extensible data sector

    // ZIP64 End of Central Directory Locator
    const zip64EocdlBuffer = Buffer.alloc(ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIZE)
    // zip64 end of central dir locator signature                               4 bytes  (0x07064b50)
    zip64EocdlBuffer.writeUInt32LE(0x07064B50, 0)
    // number of the disk with the start of the zip64 end of central directory  4 bytes
    zip64EocdlBuffer.writeUInt32LE(0, 4)
    // relative offset of the zip64 end of central directory record             8 bytes
    writeUInt64LE(zip64EocdlBuffer, this.outputStreamCursor, 8)
    // total number of disks                                                    4 bytes
    zip64EocdlBuffer.writeUInt32LE(1, 16)

    return Buffer.concat([
      zip64EocdrBuffer,
      zip64EocdlBuffer,
      eocdrBuffer,
    ])
  }
}

export class Entry {
  static readonly WAITING_FOR_METADATA = 0
  static readonly READY_TO_PUMP_FILE_DATA = 1
  static readonly FILE_DATA_IN_PROGRESS = 2
  static readonly FILE_DATA_DONE = 3

  utf8FileName: Buffer
  state = Entry.WAITING_FOR_METADATA

  crcAndFileSizeKnown = true
  crc32 = 0
  uncompressedSize = 0
  compressedSize = 0
  compress = true // default
  forceZip64Format = false
  fileComment: Buffer = Buffer.allocUnsafe(0)

  lastModFileTime = Date.now()
  lastModFileDate = Date.now()

  externalFileAttributes = 0
  relativeOffsetOfLocalHeader = 0

  doFileDataPump: any

  constructor(metadataPath: string, readonly isDirectory: boolean = false, options?: any) {
    this.utf8FileName = Buffer.from(metadataPath)
    this.setLastModDate(options.mtime != null ? options.mtime : new Date())
    if (options.mode != null)
      this.setFileAttributesMode(options.mode)
    else
      this.setFileAttributesMode(isDirectory ? 0o40775 : 0o100664)

    this.crcAndFileSizeKnown = this.isDirectory
    this.forceZip64Format = !!options.forceZip64Format
    if (options.fileComment) {
      if (typeof options.fileComment === 'string') {
        this.fileComment = Buffer.from(options.fileComment, 'utf-8')
      }
      else {
        // It should be a Buffer
        this.fileComment = options.fileComment
      }
      if (this.fileComment.length > 0xFFFF)
        throw new Error('fileComment is too large')
    }
  }

  setLastModDate(date: Date) {
    const dosDateTime = dateToDosDateTime(date)
    this.lastModFileTime = dosDateTime.time
    this.lastModFileDate = dosDateTime.date
  }

  setFileAttributesMode(mode: number) {
    if ((mode & 0xFFFF) !== mode)
      throw new Error(`invalid mode. expected: 0 <= ${mode} <= ${0xFFFF}`)
      // http://unix.stackexchange.com/questions/14705/the-zip-formats-external-file-attribute/14727#14727
    this.externalFileAttributes = (mode << 16) >>> 0
  }

  setFileDataPumpFunction(doFileDataPump: any) {
    this.doFileDataPump = doFileDataPump
    this.state = Entry.READY_TO_PUMP_FILE_DATA
  }

  useZip64Format() {
    return (this.forceZip64Format)
      || (this.uncompressedSize != null && this.uncompressedSize > 0xFFFFFFFE)
      || (this.compressedSize != null && this.compressedSize > 0xFFFFFFFE)
      || (this.relativeOffsetOfLocalHeader != null && this.relativeOffsetOfLocalHeader > 0xFFFFFFFE)
  }

  getCompressionMethod() {
    const NO_COMPRESSION = 0
    const DEFLATE_COMPRESSION = 8
    return this.compress ? DEFLATE_COMPRESSION : NO_COMPRESSION
  }

  getLocalFileHeader() {
    let crc32 = 0
    let compressedSize = 0
    let uncompressedSize = 0
    if (this.crcAndFileSizeKnown) {
      crc32 = this.crc32
      compressedSize = this.compressedSize
      uncompressedSize = this.uncompressedSize
    }

    const fixedSizeStuff = Buffer.allocUnsafe(LOCAL_FILE_HEADER_FIXED_SIZE)
    let generalPurposeBitFlag = FILE_NAME_IS_UTF8
    if (!this.crcAndFileSizeKnown)
      generalPurposeBitFlag |= UNKNOWN_CRC32_AND_FILE_SIZES

    // local file header signature     4 bytes  (0x04034b50)
    fixedSizeStuff.writeUInt32LE(0x04034B50, 0)
    // version needed to extract       2 bytes
    fixedSizeStuff.writeUInt16LE(VERSION_NEEDED_TO_EXTRACT_UTF8, 4)
    // general purpose bit flag        2 bytes
    fixedSizeStuff.writeUInt16LE(generalPurposeBitFlag, 6)
    // compression method              2 bytes
    fixedSizeStuff.writeUInt16LE(this.getCompressionMethod(), 8)
    // last mod file time              2 bytes
    fixedSizeStuff.writeUInt16LE(this.lastModFileTime, 10)
    // last mod file date              2 bytes
    fixedSizeStuff.writeUInt16LE(this.lastModFileDate, 12)
    // crc-32                          4 bytes
    fixedSizeStuff.writeUInt32LE(crc32, 14)
    // compressed size                 4 bytes
    fixedSizeStuff.writeUInt32LE(compressedSize, 18)
    // uncompressed size               4 bytes
    fixedSizeStuff.writeUInt32LE(uncompressedSize, 22)
    // file name length                2 bytes
    fixedSizeStuff.writeUInt16LE(this.utf8FileName.length, 26)
    // extra field length              2 bytes
    fixedSizeStuff.writeUInt16LE(0, 28)
    return Buffer.concat([
      fixedSizeStuff,
      // file name (variable size)
      this.utf8FileName,
      // extra field (variable size)
      // no extra fields
    ])
  }

  getDataDescriptor() {
    if (this.crcAndFileSizeKnown) {
      // the Mac Archive Utility requires this not be present unless we set general purpose bit 3
      return Buffer.allocUnsafe(0)
    }
    if (!this.useZip64Format()) {
      const buffer = Buffer.allocUnsafe(DATA_DESCRIPTOR_SIZE)
      // optional signature (required according to Archive Utility)
      buffer.writeUInt32LE(0x08074B50, 0)
      // crc-32                          4 bytes
      buffer.writeUInt32LE(this.crc32, 4)
      // compressed size                 4 bytes
      buffer.writeUInt32LE(this.compressedSize, 8)
      // uncompressed size               4 bytes
      buffer.writeUInt32LE(this.uncompressedSize, 12)
      return buffer
    }
    else {
      // ZIP64 format
      const buffer = Buffer.allocUnsafe(ZIP64_DATA_DESCRIPTOR_SIZE)
      // optional signature (unknown if anyone cares about this)
      buffer.writeUInt32LE(0x08074B50, 0)
      // crc-32                          4 bytes
      buffer.writeUInt32LE(this.crc32, 4)
      // compressed size                 8 bytes
      writeUInt64LE(buffer, this.compressedSize, 8)
      // uncompressed size               8 bytes
      writeUInt64LE(buffer, this.uncompressedSize, 16)
      return buffer
    }
  }

  getCentralDirectoryRecord() {
    const fixedSizeStuff = Buffer.allocUnsafe(CENTRAL_DIRECTORY_RECORD_FIXED_SIZE)
    let generalPurposeBitFlag = FILE_NAME_IS_UTF8
    if (!this.crcAndFileSizeKnown)
      generalPurposeBitFlag |= UNKNOWN_CRC32_AND_FILE_SIZES

    let normalCompressedSize = this.compressedSize
    let normalUncompressedSize = this.uncompressedSize
    let normalRelativeOffsetOfLocalHeader = this.relativeOffsetOfLocalHeader
    let versionNeededToExtract: number
    let zeiefBuffer: Buffer
    if (this.useZip64Format()) {
      normalCompressedSize = 0xFFFFFFFF
      normalUncompressedSize = 0xFFFFFFFF
      normalRelativeOffsetOfLocalHeader = 0xFFFFFFFF
      versionNeededToExtract = VERSION_NEEDED_TO_EXTRACT_ZIP64

      // ZIP64 extended information extra field
      zeiefBuffer = Buffer.allocUnsafe(ZIP64_EXTENDED_INFORMATION_EXTRA_FIELD_SIZE)
      // 0x0001                  2 bytes    Tag for this "extra" block type
      zeiefBuffer.writeUInt16LE(0x0001, 0)
      // Size                    2 bytes    Size of this "extra" block
      zeiefBuffer.writeUInt16LE(ZIP64_EXTENDED_INFORMATION_EXTRA_FIELD_SIZE - 4, 2)
      // Original Size           8 bytes    Original uncompressed file size
      writeUInt64LE(zeiefBuffer, this.uncompressedSize, 4)
      // Compressed Size         8 bytes    Size of compressed data
      writeUInt64LE(zeiefBuffer, this.compressedSize, 12)
      // Relative Header Offset  8 bytes    Offset of local header record
      writeUInt64LE(zeiefBuffer, this.relativeOffsetOfLocalHeader, 20)
      // Disk Start Number       4 bytes    Number of the disk on which this file starts
      // (omit)
    }
    else {
      versionNeededToExtract = VERSION_NEEDED_TO_EXTRACT_UTF8
      zeiefBuffer = Buffer.allocUnsafe(0)
    }

    // central file header signature   4 bytes  (0x02014b50)
    fixedSizeStuff.writeUInt32LE(0x02014B50, 0)
    // version made by                 2 bytes
    fixedSizeStuff.writeUInt16LE(VERSION_MADE_BY, 4)
    // version needed to extract       2 bytes
    fixedSizeStuff.writeUInt16LE(versionNeededToExtract, 6)
    // general purpose bit flag        2 bytes
    fixedSizeStuff.writeUInt16LE(generalPurposeBitFlag, 8)
    // compression method              2 bytes
    fixedSizeStuff.writeUInt16LE(this.getCompressionMethod(), 10)
    // last mod file time              2 bytes
    fixedSizeStuff.writeUInt16LE(this.lastModFileTime, 12)
    // last mod file date              2 bytes
    fixedSizeStuff.writeUInt16LE(this.lastModFileDate, 14)
    // crc-32                          4 bytes
    fixedSizeStuff.writeUInt32LE(this.crc32, 16)
    // compressed size                 4 bytes
    fixedSizeStuff.writeUInt32LE(normalCompressedSize, 20)
    // uncompressed size               4 bytes
    fixedSizeStuff.writeUInt32LE(normalUncompressedSize, 24)
    // file name length                2 bytes
    fixedSizeStuff.writeUInt16LE(this.utf8FileName.length, 28)
    // extra field length              2 bytes
    fixedSizeStuff.writeUInt16LE(zeiefBuffer.length, 30)
    // file comment length             2 bytes
    fixedSizeStuff.writeUInt16LE(this.fileComment.length, 32)
    // disk number start               2 bytes
    fixedSizeStuff.writeUInt16LE(0, 34)
    // internal file attributes        2 bytes
    fixedSizeStuff.writeUInt16LE(0, 36)
    // external file attributes        4 bytes
    fixedSizeStuff.writeUInt32LE(this.externalFileAttributes, 38)
    // relative offset of local header 4 bytes
    fixedSizeStuff.writeUInt32LE(normalRelativeOffsetOfLocalHeader, 42)

    return Buffer.concat([
      fixedSizeStuff,
      // file name (variable size)
      this.utf8FileName,
      // extra field (variable size)
      zeiefBuffer,
      // file comment (variable size)
      this.fileComment,
    ])
  }
}

class Crc32Watcher extends Transform {
  crc32 = 0

  override _transform(chunk: any, _: BufferEncoding, callback: TransformCallback): void {
    this.crc32 = crc32.unsigned(chunk, this.crc32)
    callback(null, chunk)
  }
}

class ByteCounter extends Transform {
  byteCount = 0

  override _transform(chunk: any, _: BufferEncoding, callback: TransformCallback): void {
    this.byteCount += chunk.length
    callback(null, chunk)
  }
}

function crc32(input: string | Buffer, partialCrc?: Buffer | number): Buffer {
  const signed = crc32.signed(input, partialCrc)
  const result = Buffer.alloc(4)
  result.writeInt32BE(signed, 0)
  return result
}

namespace crc32 {
  const CRC_TABLE = new Int32Array([
    0x00000000,
    0x77073096,
    0xEE0E612C,
    0x990951BA,
    0x076DC419,
    0x706AF48F,
    0xE963A535,
    0x9E6495A3,
    0x0EDB8832,
    0x79DCB8A4,
    0xE0D5E91E,
    0x97D2D988,
    0x09B64C2B,
    0x7EB17CBD,
    0xE7B82D07,
    0x90BF1D91,
    0x1DB71064,
    0x6AB020F2,
    0xF3B97148,
    0x84BE41DE,
    0x1ADAD47D,
    0x6DDDE4EB,
    0xF4D4B551,
    0x83D385C7,
    0x136C9856,
    0x646BA8C0,
    0xFD62F97A,
    0x8A65C9EC,
    0x14015C4F,
    0x63066CD9,
    0xFA0F3D63,
    0x8D080DF5,
    0x3B6E20C8,
    0x4C69105E,
    0xD56041E4,
    0xA2677172,
    0x3C03E4D1,
    0x4B04D447,
    0xD20D85FD,
    0xA50AB56B,
    0x35B5A8FA,
    0x42B2986C,
    0xDBBBC9D6,
    0xACBCF940,
    0x32D86CE3,
    0x45DF5C75,
    0xDCD60DCF,
    0xABD13D59,
    0x26D930AC,
    0x51DE003A,
    0xC8D75180,
    0xBFD06116,
    0x21B4F4B5,
    0x56B3C423,
    0xCFBA9599,
    0xB8BDA50F,
    0x2802B89E,
    0x5F058808,
    0xC60CD9B2,
    0xB10BE924,
    0x2F6F7C87,
    0x58684C11,
    0xC1611DAB,
    0xB6662D3D,
    0x76DC4190,
    0x01DB7106,
    0x98D220BC,
    0xEFD5102A,
    0x71B18589,
    0x06B6B51F,
    0x9FBFE4A5,
    0xE8B8D433,
    0x7807C9A2,
    0x0F00F934,
    0x9609A88E,
    0xE10E9818,
    0x7F6A0DBB,
    0x086D3D2D,
    0x91646C97,
    0xE6635C01,
    0x6B6B51F4,
    0x1C6C6162,
    0x856530D8,
    0xF262004E,
    0x6C0695ED,
    0x1B01A57B,
    0x8208F4C1,
    0xF50FC457,
    0x65B0D9C6,
    0x12B7E950,
    0x8BBEB8EA,
    0xFCB9887C,
    0x62DD1DDF,
    0x15DA2D49,
    0x8CD37CF3,
    0xFBD44C65,
    0x4DB26158,
    0x3AB551CE,
    0xA3BC0074,
    0xD4BB30E2,
    0x4ADFA541,
    0x3DD895D7,
    0xA4D1C46D,
    0xD3D6F4FB,
    0x4369E96A,
    0x346ED9FC,
    0xAD678846,
    0xDA60B8D0,
    0x44042D73,
    0x33031DE5,
    0xAA0A4C5F,
    0xDD0D7CC9,
    0x5005713C,
    0x270241AA,
    0xBE0B1010,
    0xC90C2086,
    0x5768B525,
    0x206F85B3,
    0xB966D409,
    0xCE61E49F,
    0x5EDEF90E,
    0x29D9C998,
    0xB0D09822,
    0xC7D7A8B4,
    0x59B33D17,
    0x2EB40D81,
    0xB7BD5C3B,
    0xC0BA6CAD,
    0xEDB88320,
    0x9ABFB3B6,
    0x03B6E20C,
    0x74B1D29A,
    0xEAD54739,
    0x9DD277AF,
    0x04DB2615,
    0x73DC1683,
    0xE3630B12,
    0x94643B84,
    0x0D6D6A3E,
    0x7A6A5AA8,
    0xE40ECF0B,
    0x9309FF9D,
    0x0A00AE27,
    0x7D079EB1,
    0xF00F9344,
    0x8708A3D2,
    0x1E01F268,
    0x6906C2FE,
    0xF762575D,
    0x806567CB,
    0x196C3671,
    0x6E6B06E7,
    0xFED41B76,
    0x89D32BE0,
    0x10DA7A5A,
    0x67DD4ACC,
    0xF9B9DF6F,
    0x8EBEEFF9,
    0x17B7BE43,
    0x60B08ED5,
    0xD6D6A3E8,
    0xA1D1937E,
    0x38D8C2C4,
    0x4FDFF252,
    0xD1BB67F1,
    0xA6BC5767,
    0x3FB506DD,
    0x48B2364B,
    0xD80D2BDA,
    0xAF0A1B4C,
    0x36034AF6,
    0x41047A60,
    0xDF60EFC3,
    0xA867DF55,
    0x316E8EEF,
    0x4669BE79,
    0xCB61B38C,
    0xBC66831A,
    0x256FD2A0,
    0x5268E236,
    0xCC0C7795,
    0xBB0B4703,
    0x220216B9,
    0x5505262F,
    0xC5BA3BBE,
    0xB2BD0B28,
    0x2BB45A92,
    0x5CB36A04,
    0xC2D7FFA7,
    0xB5D0CF31,
    0x2CD99E8B,
    0x5BDEAE1D,
    0x9B64C2B0,
    0xEC63F226,
    0x756AA39C,
    0x026D930A,
    0x9C0906A9,
    0xEB0E363F,
    0x72076785,
    0x05005713,
    0x95BF4A82,
    0xE2B87A14,
    0x7BB12BAE,
    0x0CB61B38,
    0x92D28E9B,
    0xE5D5BE0D,
    0x7CDCEFB7,
    0x0BDBDF21,
    0x86D3D2D4,
    0xF1D4E242,
    0x68DDB3F8,
    0x1FDA836E,
    0x81BE16CD,
    0xF6B9265B,
    0x6FB077E1,
    0x18B74777,
    0x88085AE6,
    0xFF0F6A70,
    0x66063BCA,
    0x11010B5C,
    0x8F659EFF,
    0xF862AE69,
    0x616BFFD3,
    0x166CCF45,
    0xA00AE278,
    0xD70DD2EE,
    0x4E048354,
    0x3903B3C2,
    0xA7672661,
    0xD06016F7,
    0x4969474D,
    0x3E6E77DB,
    0xAED16A4A,
    0xD9D65ADC,
    0x40DF0B66,
    0x37D83BF0,
    0xA9BCAE53,
    0xDEBB9EC5,
    0x47B2CF7F,
    0x30B5FFE9,
    0xBDBDF21C,
    0xCABAC28A,
    0x53B39330,
    0x24B4A3A6,
    0xBAD03605,
    0xCDD70693,
    0x54DE5729,
    0x23D967BF,
    0xB3667A2E,
    0xC4614AB8,
    0x5D681B02,
    0x2A6F2B94,
    0xB40BBE37,
    0xC30C8EA1,
    0x5A05DF1B,
    0x2D02EF8D,
  ])

  function _crc32(buf: Buffer, partialCrc?: Buffer | number) {
    if (Buffer.isBuffer(partialCrc))
      partialCrc = partialCrc.readUInt32BE(0)

    let crc = ~~(partialCrc ?? 0) ^ -1
    for (let n = 0; n < buf.length; n++)
      crc = CRC_TABLE[(crc ^ buf[n]) & 0xFF] ^ (crc >>> 8)

    return (crc ^ -1)
  }

  export function signed(buf: string | Buffer, partialCrc?: Buffer | number) {
    return _crc32(Buffer.from(buf), partialCrc)
  }

  export function unsigned(buf: string | Buffer, partialCrc?: Buffer | number) {
    return _crc32(Buffer.from(buf), partialCrc) >>> 0
  }
}

export const cp437 = '\u0000☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ '
if (cp437.length !== 256)
  throw new Error('assertion failure')
let reverseCp437: any = null
function encodeCp437(string: string) {
  if (/^[\x20-\x7E]*$/.test(string)) {
    // CP437, ASCII, and UTF-8 overlap in this range.
    return Buffer.from(string, 'utf-8')
  }

  // This is the slow path.
  if (reverseCp437 == null) {
    // cache this once
    reverseCp437 = {}
    for (let i = 0; i < cp437.length; i++)
      reverseCp437[cp437[i]] = i
  }

  const result = Buffer.allocUnsafe(string.length)
  for (let i = 0; i < string.length; i++) {
    const b = reverseCp437[string[i]]
    if (b == null)
      throw new Error(`character not encodable in CP437: ${JSON.stringify(string[i])}`)
    result[i] = b
  }

  return result
}
