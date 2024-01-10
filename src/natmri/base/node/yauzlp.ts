import type { TransformCallback } from 'node:stream'
import { EventEmitter, PassThrough, Readable, Transform, Writable } from 'node:stream'
import fs from 'node:fs'
import zlib from 'node:zlib'
import { Buffer } from 'node:buffer'
import { cp437 } from './yazlp'

export namespace yauzl {
  export interface ZipFileOptions {
    decompress: boolean | null
    decrypt: boolean | null
    start: number | null
    end: number | null
  }

  export interface Options {
    autoClose?: boolean | undefined
    lazyEntries?: boolean | undefined
    decodeStrings?: boolean | undefined
    validateEntrySizes?: boolean | undefined
    strictFileNames?: boolean | undefined
  }

  class AssertByteCountStream extends Transform {
    actualByteCount = 0
    expectedByteCount = 0

    constructor(byteCount: number) {
      super()
      this.expectedByteCount = byteCount
    }

    override _transform(chunk: any, _: BufferEncoding, callback: TransformCallback): void {
      this.actualByteCount += chunk.length
      if (this.actualByteCount > this.expectedByteCount) {
        const msg = `too many bytes in the stream. expected ${this.expectedByteCount}. got at least ${this.actualByteCount}`
        return callback(new Error(msg))
      }
      callback(null, chunk)
    }

    override _flush(callback: TransformCallback): void {
      if (this.actualByteCount < this.expectedByteCount) {
        const msg = `not enough bytes in the stream. expected ${this.expectedByteCount}. got only ${this.actualByteCount}`
        return callback(new Error(msg))
      }
      callback()
    }
  }

  class RefUnrefFilter extends PassThrough {
    unreffedYet = false

    constructor(readonly context: RandomAccessReader) {
      super()
      this.context.ref()
    }

    override _flush(callback: TransformCallback): void {
      this.unref()
      callback()
    }

    unref() {
      if (this.unreffedYet)
        return
      this.unreffedYet = true
      this.context.unref()
    }
  }

  abstract class RandomAccessReader extends EventEmitter {
    private refCount = 0

    ref() {
      this.refCount += 1
    }

    unref() {
      this.refCount -= 1
      if (this.refCount > 0)
        return
      if (this.refCount < 0)
        throw new Error('invalid unref')

      this.close((err: Error | null) => {
        if (err)
          return this.emit('error', err)
        this.emit('close')
      })
    }

    abstract _readStreamForRange(start: number, end: number): Readable

    createReadStream(options: { start: number, end: number }) {
      const start = options.start
      const end = options.end
      if (start === end) {
        const emptyStream = new PassThrough()
        setImmediate(() => {
          emptyStream.end()
        })
        return emptyStream
      }
      const stream = this._readStreamForRange(start, end)

      let destroyed = false
      const refUnrefFilter = new RefUnrefFilter(this)
      stream.on('error', (err) => {
        setImmediate(() => {
          if (!destroyed)
            refUnrefFilter.emit('error', err)
        })
      })
      refUnrefFilter.destroy = function () {
        stream.unpipe(refUnrefFilter)
        refUnrefFilter.unref()
        stream.destroy()
        return refUnrefFilter
      }

      const byteCounter = new AssertByteCountStream(end - start)
      refUnrefFilter.on('error', (err) => {
        setImmediate(() => {
          if (!destroyed)
            byteCounter.emit('error', err)
        })
      })
      byteCounter.destroy = function () {
        destroyed = true
        refUnrefFilter.unpipe(byteCounter)
        refUnrefFilter.destroy()
        return byteCounter
      }

      return stream.pipe(refUnrefFilter).pipe(byteCounter)
    }

    read(buffer: Buffer, offset: number, length: number, position: number, callback: (err: Error | null, bytesRead: number) => void): void {
      const readStream = this.createReadStream({ start: position, end: position + length })
      const writeStream = new Writable()
      let written = 0
      writeStream._write = function (chunk, _, cb) {
        chunk.copy(buffer, offset + written, 0, chunk.length)
        written += chunk.length
        cb()
      }
      writeStream.on('finish', () => {
        callback(null, written)
      })
      readStream.on('error', (error) => {
        callback(error, 0)
      })
      readStream.pipe(writeStream)
    }

    close(callback: (err: Error | null) => void): void {
      setImmediate(() => callback(new Error('error')))
    }
  }

  export class ZipFile extends EventEmitter {
    readEntryCursor = 0
    entriesRead = 0
    isOpen = true
    emittedError = false

    constructor(
      public reader: FdSlicer,
      public centralDirectoryOffset: number,
      public fileSize: number,
      public entryCount: number,
      public comment: string | Buffer,
      public autoClose: boolean,
      public lazyEntries: boolean,
      public decodeStrings: boolean,
      public validateEntrySizes: boolean,
      public strictFileNames: boolean,
    ) {
      super()

      this.reader.on('error', (err: Error) => this.emitError(err))
      this.reader.once('close', () => this.emit('close'))

      if (!this.lazyEntries)
        this._readEntry()
    }

    readEntry() {
      if (!this.lazyEntries)
        throw new Error('readEntry() called without lazyEntries:true')
      this._readEntry()
    }

    openReadStream(entry: Entry, options: ZipFileOptions, callback: (err: Error | null) => void): void
    openReadStream(entry: Entry, callback: (err: Error | null) => void): void
    openReadStream(entry: Entry, options: any, callback?: any) {
      // parameter validation
      let relativeStart = 0
      let relativeEnd = entry.compressedSize
      if (!callback) {
        callback = options
        options = {}
      }
      else {
        // validate options that the caller has no excuse to get wrong
        if (options.decrypt != null) {
          if (!entry.isEncrypted())
            throw new Error('options.decrypt can only be specified for encrypted entries')

          if (options.decrypt !== false)
            throw new Error(`invalid options.decrypt value: ${options.decrypt}`)
          if (entry.isCompressed()) {
            if (options.decompress !== false)
              throw new Error('entry is encrypted and compressed, and options.decompress !== false')
          }
        }
        if (options.decompress != null) {
          if (!entry.isCompressed())
            throw new Error('options.decompress can only be specified for compressed entries')

          if (!(options.decompress === false || options.decompress === true))
            throw new Error(`invalid options.decompress value: ${options.decompress}`)
        }
        if (options.start != null || options.end != null) {
          if (entry.isCompressed() && options.decompress !== false)
            throw new Error('start/end range not allowed for compressed entry without options.decompress === false')

          if (entry.isEncrypted() && options.decrypt !== false)
            throw new Error('start/end range not allowed for encrypted entry without options.decrypt === false')
        }
        if (options.start != null) {
          relativeStart = options.start
          if (relativeStart < 0)
            throw new Error('options.start < 0')
          if (relativeStart > entry.compressedSize)
            throw new Error('options.start > entry.compressedSize')
        }
        if (options.end != null) {
          relativeEnd = options.end
          if (relativeEnd < 0)
            throw new Error('options.end < 0')
          if (relativeEnd > entry.compressedSize)
            throw new Error('options.end > entry.compressedSize')
          if (relativeEnd < relativeStart)
            throw new Error('options.end < options.start')
        }
      }
      // any further errors can either be caused by the zipfile,
      // or were introduced in a minor version of yauzl,
      // so should be passed to the client rather than thrown.
      if (!this.isOpen)
        return callback?.(new Error('closed'))
      if (entry.isEncrypted()) {
        if (options.decrypt !== false)
          return callback?.(new Error('entry is encrypted, and options.decrypt !== false'))
      }

      // make sure we don't lose the fd before we open the actual read stream
      this.reader.ref()
      const buffer = Buffer.alloc(30)
      readAndAssertNoEof(this.reader, buffer, 0, buffer.length, entry.relativeOffsetOfLocalHeader, (err) => {
        try {
          if (err)
            return callback?.(err)
          // 0 - Local file header signature = 0x04034b50
          const signature = buffer.readUInt32LE(0)
          if (signature !== 0x04034B50)
            return callback?.(new Error(`invalid local file header signature: 0x${signature.toString(16)}`))

          // all this should be redundant
          // 4 - Version needed to extract (minimum)
          // 6 - General purpose bit flag
          // 8 - Compression method
          // 10 - File last modification time
          // 12 - File last modification date
          // 14 - CRC-32
          // 18 - Compressed size
          // 22 - Uncompressed size
          // 26 - File name length (n)
          const fileNameLength = buffer.readUInt16LE(26)
          // 28 - Extra field length (m)
          const extraFieldLength = buffer.readUInt16LE(28)
          // 30 - File name
          // 30+n - Extra field
          const localFileHeaderEnd = entry.relativeOffsetOfLocalHeader + buffer.length + fileNameLength + extraFieldLength
          let decompress: boolean
          if (entry.compressionMethod === 0) {
            // 0 - The file is stored (no compression)
            decompress = false
          }
          else if (entry.compressionMethod === 8) {
            // 8 - The file is Deflated
            decompress = options.decompress != null ? options.decompress : true
          }
          else {
            return callback?.(new Error(`unsupported compression method: ${entry.compressionMethod}`))
          }
          const fileDataStart = localFileHeaderEnd
          const fileDataEnd = fileDataStart + entry.compressedSize
          if (entry.compressedSize !== 0) {
            // bounds check now, because the read streams will probably not complain loud enough.
            // since we're dealing with an unsigned offset plus an unsigned size,
            // we only have 1 thing to check for.
            if (fileDataEnd > this.fileSize)
              return callback?.(new Error(`file data overflows file bounds: ${fileDataStart} + ${entry.compressedSize} > ${this.fileSize}`))
          }
          const readStream = this.reader.createReadStream({
            start: fileDataStart + relativeStart,
            end: fileDataStart + relativeEnd,
          })
          let endpointStream = readStream
          if (decompress) {
            let destroyed = false
            const inflateFilter = zlib.createInflateRaw()
            readStream.on('error', (err) => {
              // setImmediate here because errors can be emitted during the first call to pipe()
              setImmediate(() => {
                if (!destroyed)
                  inflateFilter.emit('error', err)
              })
            })
            readStream.pipe(inflateFilter)

            if (this.validateEntrySizes) {
              endpointStream = new AssertByteCountStream(entry.uncompressedSize)
              inflateFilter.on('error', (err) => {
                // forward zlib errors to the client-visible stream
                setImmediate(() => {
                  if (!destroyed)
                    endpointStream.emit('error', err)
                })
              })
              inflateFilter.pipe(endpointStream)
            }
            else {
              // the zlib filter is the client-visible stream
              endpointStream = inflateFilter
            }
            // this is part of yauzl's API, so implement this function on the client-visible stream
            endpointStream.destroy = function () {
              destroyed = true
              if (inflateFilter !== endpointStream)
                inflateFilter.unpipe(endpointStream)
              readStream.unpipe(inflateFilter)
              // TODO: the inflateFilter may cause a memory leak. see Issue #27.
              readStream.destroy()
              return readStream
            }
          }
          callback?.(null, endpointStream)
        }
        finally {
          this.reader.unref()
        }
      })
    }

    close() {
      if (!this.isOpen)
        return
      this.isOpen = false
      this.reader.unref()
    }

    private _readEntry() {
      if (this.entryCount === this.entriesRead) {
        // done with metadata
        setImmediate(() => {
          if (this.autoClose)
            this.close()
          if (this.emittedError)
            return
          this.emit('end')
        })
        return
      }
      if (this.emittedError)
        return
      let buffer = Buffer.alloc(46)
      readAndAssertNoEof(this.reader, buffer, 0, buffer.length, this.readEntryCursor, (err: Error) => {
        if (err)
          return this.emitErrorAndAutoClose(err)
        if (this.emittedError)
          return
        const entry = new Entry()
        // 0 - Central directory file header signature
        const signature = buffer.readUInt32LE(0)
        if (signature !== 0x02014B50)
        // return this.emitErrorAndAutoClose(new Error(`invalid central directory file header signature: 0x${signature.toString(16)}`))
        // 4 - Version made by
          entry.versionMadeBy = buffer.readUInt16LE(4)
        // 6 - Version needed to extract (minimum)
        entry.versionNeededToExtract = buffer.readUInt16LE(6)
        // 8 - General purpose bit flag
        entry.generalPurposeBitFlag = buffer.readUInt16LE(8)
        // 10 - Compression method
        entry.compressionMethod = buffer.readUInt16LE(10)
        // 12 - File last modification time
        entry.lastModFileTime = buffer.readUInt16LE(12)
        // 14 - File last modification date
        entry.lastModFileDate = buffer.readUInt16LE(14)
        // 16 - CRC-32
        entry.crc32 = buffer.readUInt32LE(16)
        // 20 - Compressed size
        entry.compressedSize = buffer.readUInt32LE(20)
        // 24 - Uncompressed size
        entry.uncompressedSize = buffer.readUInt32LE(24)
        // 28 - File name length (n)
        entry.fileNameLength = buffer.readUInt16LE(28)
        // 30 - Extra field length (m)
        entry.extraFieldLength = buffer.readUInt16LE(30)
        // 32 - File comment length (k)
        entry.fileCommentLength = buffer.readUInt16LE(32)
        // 34 - Disk number where file starts
        // 36 - Internal file attributes
        entry.internalFileAttributes = buffer.readUInt16LE(36)
        // 38 - External file attributes
        entry.externalFileAttributes = buffer.readUInt32LE(38)
        // 42 - Relative offset of local file header
        entry.relativeOffsetOfLocalHeader = buffer.readUInt32LE(42)

        if (entry.generalPurposeBitFlag & 0x40)
          return this.emitErrorAndAutoClose(new Error('strong encryption is not supported'))

        this.readEntryCursor += 46

        buffer = Buffer.alloc(entry.fileNameLength + entry.extraFieldLength + entry.fileCommentLength)
        readAndAssertNoEof(this.reader, buffer, 0, buffer.length, this.readEntryCursor, (err: Error) => {
          if (err)
            return this.emitErrorAndAutoClose(err)
          if (this.emittedError)
            return
          // 46 - File name
          const isUtf8 = (entry.generalPurposeBitFlag & 0x800) !== 0
          entry.fileName = this.decodeStrings
            ? decodeBuffer(buffer, 0, entry.fileNameLength, isUtf8)
            : buffer.slice(0, entry.fileNameLength).toString('utf-8')

          // 46+n - Extra field
          const fileCommentStart = entry.fileNameLength + entry.extraFieldLength
          const extraFieldBuffer = buffer.slice(entry.fileNameLength, fileCommentStart)
          entry.extraFields = []
          let i = 0
          while (i < extraFieldBuffer.length - 3) {
            const headerId = extraFieldBuffer.readUInt16LE(i + 0)
            const dataSize = extraFieldBuffer.readUInt16LE(i + 2)
            const dataStart = i + 4
            const dataEnd = dataStart + dataSize
            if (dataEnd > extraFieldBuffer.length)
              return this.emitErrorAndAutoClose(new Error('extra field length exceeds extra field buffer size'))
            const dataBuffer = Buffer.alloc(dataSize)
            extraFieldBuffer.copy(dataBuffer, 0, dataStart, dataEnd)
            entry.extraFields.push({
              id: headerId,
              data: dataBuffer,
            })
            i = dataEnd
          }

          // 46+n+m - File comment
          entry.fileComment = this.decodeStrings
            ? decodeBuffer(buffer, fileCommentStart, fileCommentStart + entry.fileCommentLength, isUtf8)
            : buffer.slice(fileCommentStart, fileCommentStart + entry.fileCommentLength)
          // compatibility hack for https://github.com/thejoshwolfe/yauzl/issues/47
          entry.comment = entry.fileComment.toString()

          this.readEntryCursor += buffer.length
          this.entriesRead += 1

          if (entry.uncompressedSize === 0xFFFFFFFF
            || entry.compressedSize === 0xFFFFFFFF
            || entry.relativeOffsetOfLocalHeader === 0xFFFFFFFF) {
            // ZIP64 format
            // find the Zip64 Extended Information Extra Field
            let zip64EiefBuffer: Buffer | null = null
            for (let i = 0; i < entry.extraFields.length; i++) {
              const extraField = entry.extraFields[i]
              if (extraField.id === 0x0001) {
                zip64EiefBuffer = extraField.data
                break
              }
            }
            if (zip64EiefBuffer == null)
              return this.emitErrorAndAutoClose(new Error('expected zip64 extended information extra field'))

            let index = 0
            // 0 - Original Size          8 bytes
            if (entry.uncompressedSize === 0xFFFFFFFF) {
              if (index + 8 > zip64EiefBuffer.length)
                return this.emitErrorAndAutoClose(new Error('zip64 extended information extra field does not include uncompressed size'))

              entry.uncompressedSize = readUInt64LE(zip64EiefBuffer, index)
              index += 8
            }
            // 8 - Compressed Size        8 bytes
            if (entry.compressedSize === 0xFFFFFFFF) {
              if (index + 8 > zip64EiefBuffer.length)
                return this.emitErrorAndAutoClose(new Error('zip64 extended information extra field does not include compressed size'))

              entry.compressedSize = readUInt64LE(zip64EiefBuffer, index)
              index += 8
            }
            // 16 - Relative Header Offset 8 bytes
            if (entry.relativeOffsetOfLocalHeader === 0xFFFFFFFF) {
              if (index + 8 > zip64EiefBuffer.length)
                return this.emitErrorAndAutoClose(new Error('zip64 extended information extra field does not include relative header offset'))

              entry.relativeOffsetOfLocalHeader = readUInt64LE(zip64EiefBuffer, index)
              index += 8
            }
            // 24 - Disk Start Number      4 bytes
          }

          // check for Info-ZIP Unicode Path Extra Field (0x7075)
          // see https://github.com/thejoshwolfe/yauzl/issues/33
          if (this.decodeStrings) {
            for (let i = 0; i < entry.extraFields.length; i++) {
              const extraField = entry.extraFields[i]
              if (extraField.id === 0x7075) {
                if (extraField.data.length < 6) {
                  // too short to be meaningful
                  continue
                }
                // Version       1 byte      version of this extra field, currently 1
                if (extraField.data.readUInt8(0) !== 1) {
                  // > Changes may not be backward compatible so this extra
                  // > field should not be used if the version is not recognized.
                  continue
                }
                // NameCRC32     4 bytes     File Name Field CRC32 Checksum
                const oldNameCrc32 = extraField.data.readUInt32LE(1)
                if (crc32.unsigned(buffer.slice(0, entry.fileNameLength)) !== oldNameCrc32) {
                  // > If the CRC check fails, this UTF-8 Path Extra Field should be
                  // > ignored and the File Name field in the header should be used instead.
                  continue
                }
                // UnicodeName   Variable    UTF-8 version of the entry File Name
                entry.fileName = decodeBuffer(extraField.data, 5, extraField.data.length, true)
                break
              }
            }
          }

          // validate file size
          if (this.validateEntrySizes && entry.compressionMethod === 0) {
            let expectedCompressedSize = entry.uncompressedSize
            if (entry.isEncrypted()) {
              // traditional encryption prefixes the file data with a header
              expectedCompressedSize += 12
            }
            if (entry.compressedSize !== expectedCompressedSize) {
              const msg = `compressed/uncompressed size mismatch for stored file: ${entry.compressedSize} != ${entry.uncompressedSize}`
              return this.emitErrorAndAutoClose(new Error(msg))
            }
          }

          if (this.decodeStrings) {
            if (!this.strictFileNames) {
              // allow backslash
              if (typeof entry.fileName === 'string')
                entry.fileName = entry.fileName.replace(/\\/g, '/')
            }
            if (typeof entry.fileName === 'string') {
              const errorMessage = validateFileName(entry.fileName)
              if (errorMessage != null)
                return this.emitErrorAndAutoClose(new Error(errorMessage))
            }
          }
          this.emit('entry', entry)

          if (!this.lazyEntries)
            this._readEntry()
        })
      })
    }

    private emitErrorAndAutoClose(err: Error) {
      if (this.autoClose)
        this.close()
      this.emitError(err)
    }

    private emitError(err: Error) {
      if (this.emittedError)
        return
      this.emittedError = true
      this.emit('error', err)
    }
  }

  export class Entry {
    lastModFileDate = 0
    lastModFileTime = 0
    generalPurposeBitFlag = 0
    compressionMethod = 8
    comment = ''
    compressedSize = 0
    crc32 = 0
    externalFileAttributes = 0
    extraFieldLength = 0
    extraFields: Array<{ id: number, data: Buffer }> = []
    fileCommentLength = 0
    fileName = ''
    fileNameLength = 0
    internalFileAttributes = 0
    relativeOffsetOfLocalHeader = 0
    uncompressedSize = 0
    versionMadeBy = 0
    versionNeededToExtract = 0

    getLastModDate() {
      return dosDateTimeToDate(this.lastModFileDate, this.lastModFileTime)
    }

    isEncrypted() {
      return (this.generalPurposeBitFlag & 0x1) !== 0
    }

    isCompressed() {
      return this.compressionMethod === 8
    }
  }

  function readAndAssertNoEof(reader: FdSlicer, buffer: Buffer, offset: number, length: number, position: number, callback: any) {
    if (length === 0) {
      // fs.read will throw an out-of-bounds error if you try to read 0 bytes from a 0 byte file
      return setImmediate(() => {
        callback(null, Buffer.alloc(0))
      })
    }
    reader.read(buffer, offset, length, position, (err: null | Error, bytesRead: number) => {
      if (err)
        return callback(err)

      console.log(bytesRead)
      if (bytesRead < length)
        return callback(new Error('unexpected EOF'))

      callback()
    })
  }

  export function open(path: string, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = null
    }
    if (options == null)
      options = {}
    if (options.autoClose == null)
      options.autoClose = true
    if (options.lazyEntries == null)
      options.lazyEntries = false
    if (options.decodeStrings == null)
      options.decodeStrings = true
    if (options.validateEntrySizes == null)
      options.validateEntrySizes = true
    if (options.strictFileNames == null)
      options.strictFileNames = false
    if (callback == null)
      callback = () => { }
    fs.open(path, 'r', (err, fd) => {
      if (err)
        return callback(err)
      fromFd(fd, options, (err, zipfile) => {
        if (err)
          fs.close(fd, () => { })
        callback(err, zipfile)
      })
    })
  }

  export function fromFd(fd: number, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = null
    }
    if (options == null)
      options = {}
    if (options.autoClose == null)
      options.autoClose = false
    if (options.lazyEntries == null)
      options.lazyEntries = false
    if (options.decodeStrings == null)
      options.decodeStrings = true
    if (options.validateEntrySizes == null)
      options.validateEntrySizes = true
    if (options.strictFileNames == null)
      options.strictFileNames = false
    if (callback == null)
      callback = () => { }
    fs.fstat(fd, (err, stats) => {
      if (err)
        return callback(err)
      const reader = createFromFd(fd, { autoClose: true })
      fromRandomAccessReader(reader, stats.size, options, callback)
    })
  }

  function fromRandomAccessReader(reader: FdSlicer, totalSize: number, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = null
    }
    if (options == null)
      options = {}
    if (options.autoClose == null)
      options.autoClose = true
    if (options.lazyEntries == null)
      options.lazyEntries = false
    if (options.decodeStrings == null)
      options.decodeStrings = true
    const decodeStrings = !!options.decodeStrings
    if (options.validateEntrySizes == null)
      options.validateEntrySizes = true
    if (options.strictFileNames == null)
      options.strictFileNames = false
    if (callback == null)
      callback = () => { }
    if (typeof totalSize !== 'number')
      throw new Error('expected totalSize parameter to be a number')
    if (totalSize > Number.MAX_SAFE_INTEGER)
      throw new Error('zip file too large. only file sizes up to 2^52 are supported due to JavaScript\'s Number type being an IEEE 754 double.')

    // the matching unref() call is in zipfile.close()
    reader.ref()

    // eocdr means End of Central Directory Record.
    // search backwards for the eocdr signature.
    // the last field of the eocdr is a variable-length comment.
    // the comment size is encoded in a 2-byte field in the eocdr, which we can't find without trudging backwards through the comment to find it.
    // as a consequence of this design decision, it's possible to have ambiguous zip file metadata if a coherent eocdr was in the comment.
    // we search backwards for a eocdr signature, and hope that whoever made the zip file was smart enough to forbid the eocdr signature in the comment.
    const eocdrWithoutCommentSize = 22
    const maxCommentSize = 0xFFFF // 2-byte size
    const bufferSize = Math.min(eocdrWithoutCommentSize + maxCommentSize, totalSize)
    const buffer = Buffer.alloc(bufferSize)
    const bufferReadStart = totalSize - buffer.length
    readAndAssertNoEof(reader, buffer, 0, bufferSize, bufferReadStart, (err) => {
      if (err)
        return callback(err)
      for (let i = bufferSize - eocdrWithoutCommentSize; i >= 0; i -= 1) {
        if (buffer.readUInt32LE(i) !== 0x06054B50)
          continue
        // found eocdr
        const eocdrBuffer = buffer.slice(i)

        // 0 - End of central directory signature = 0x06054b50
        // 4 - Number of this disk
        const diskNumber = eocdrBuffer.readUInt16LE(4)
        if (diskNumber !== 0)
          return callback(new Error(`multi-disk zip files are not supported: found disk number: ${diskNumber}`))

        // 6 - Disk where central directory starts
        // 8 - Number of central directory records on this disk
        // 10 - Total number of central directory records
        let entryCount = eocdrBuffer.readUInt16LE(10)
        // 12 - Size of central directory (bytes)
        // 16 - Offset of start of central directory, relative to start of archive
        let centralDirectoryOffset = eocdrBuffer.readUInt32LE(16)
        // 20 - Comment length
        const commentLength = eocdrBuffer.readUInt16LE(20)
        const expectedCommentLength = eocdrBuffer.length - eocdrWithoutCommentSize
        if (commentLength !== expectedCommentLength)
          return callback(new Error(`invalid comment length. expected: ${expectedCommentLength}. found: ${commentLength}`))

        // 22 - Comment
        // the encoding is always cp437.
        const comment = decodeStrings
          ? decodeBuffer(eocdrBuffer, 22, eocdrBuffer.length, false)
          : eocdrBuffer.slice(22)

        if (!(entryCount === 0xFFFF || centralDirectoryOffset === 0xFFFFFFFF))
          return callback(null, new ZipFile(reader, centralDirectoryOffset, totalSize, entryCount, comment, options.autoClose, options.lazyEntries, decodeStrings, options.validateEntrySizes, options.strictFileNames))

        // ZIP64 format

        // ZIP64 Zip64 end of central directory locator
        const zip64EocdlBuffer = Buffer.alloc(20)
        const zip64EocdlOffset = bufferReadStart + i - zip64EocdlBuffer.length
        readAndAssertNoEof(reader, zip64EocdlBuffer, 0, zip64EocdlBuffer.length, zip64EocdlOffset, (err) => {
          if (err)
            return callback(err)

          // 0 - zip64 end of central dir locator signature = 0x07064b50
          if (zip64EocdlBuffer.readUInt32LE(0) !== 0x07064B50)
            return callback(new Error('invalid zip64 end of central directory locator signature'))

          // 4 - number of the disk with the start of the zip64 end of central directory
          // 8 - relative offset of the zip64 end of central directory record
          const zip64EocdrOffset = readUInt64LE(zip64EocdlBuffer, 8)
          // 16 - total number of disks

          // ZIP64 end of central directory record
          const zip64EocdrBuffer = Buffer.alloc(56)
          readAndAssertNoEof(reader, zip64EocdrBuffer, 0, zip64EocdrBuffer.length, zip64EocdrOffset, (err) => {
            if (err)
              return callback(err)

            // 0 - zip64 end of central dir signature                           4 bytes  (0x06064b50)
            if (zip64EocdrBuffer.readUInt32LE(0) !== 0x06064B50)
              return callback(new Error('invalid zip64 end of central directory record signature'))

            // 4 - size of zip64 end of central directory record                8 bytes
            // 12 - version made by                                             2 bytes
            // 14 - version needed to extract                                   2 bytes
            // 16 - number of this disk                                         4 bytes
            // 20 - number of the disk with the start of the central directory  4 bytes
            // 24 - total number of entries in the central directory on this disk         8 bytes
            // 32 - total number of entries in the central directory            8 bytes
            entryCount = readUInt64LE(zip64EocdrBuffer, 32)
            // 40 - size of the central directory                               8 bytes
            // 48 - offset of start of central directory with respect to the starting disk number     8 bytes
            centralDirectoryOffset = readUInt64LE(zip64EocdrBuffer, 48)
            // 56 - zip64 extensible data sector                                (variable size)
            return callback(null, new ZipFile(reader, centralDirectoryOffset, totalSize, entryCount, comment, options.autoClose, options.lazyEntries, decodeStrings, options.validateEntrySizes, options.strictFileNames))
          })
        })
        return
      }
      callback(new Error('end of central directory record signature not found'))
    })
  }

}

class Pend {
  pending = 0
  max = Number.POSITIVE_INFINITY
  listeners: Function[] = []
  waiting: Function[] = []
  error: Error | null = null

  go(fn: Function) {
    if (this.pending < this.max)
      fn(this.hold())
    else
      this.waiting.push(fn)
  }

  wait(cb: Function) {
    if (this.pending === 0)
      cb(this.error)
    else
      this.listeners.push(cb)
  }

  hold() {
    this.pending += 1
    let called = false
    return (err: Error) => {
      if (called)
        throw new Error('callback called twice')
      called = true
      this.error = this.error || err
      this.pending -= 1
      if (this.waiting.length > 0 && this.pending < this.max) {
        this.waiting.shift()?.(this.hold())
      }
      else if (this.pending === 0) {
        const listeners = this.listeners
        this.listeners = []
        listeners.forEach(listener => listener(this.error))
      }
    }
  }
}

class FdSlicer extends EventEmitter {
  pend = new Pend()
  refCount = 0
  autoClose = false

  constructor(readonly fd: number, options: any = {}) {
    super()

    this.pend.max = 1
    this.autoClose = !!options.autoClose
  }

  read(buffer: Buffer, offset: number, length: number, position: number, callback: (err: Error | null, bytesRead: number, buffer: Buffer) => void) {
    this.pend.go((cb: any) => {
      fs.read(this.fd, buffer, offset, length, position, (err, bytesRead, buffer) => {
        cb()
        callback(err, bytesRead, buffer)
      })
    })
  }

  write(buffer: Buffer, offset: number, length: number, position: number, callback: (err: Error | null, bytesRead: number, buffer: Buffer) => void) {
    this.pend.go((cb: any) => {
      fs.write(this.fd, buffer, offset, length, position, (err, written, buffer) => {
        cb()
        callback(err, written, buffer)
      })
    })
  }

  createReadStream(options: any) {
    return new ReadStream(this, options)
  }

  createWriteStream(options: any) {
    return new WriteStream(this, options)
  }

  ref() {
    this.refCount += 1
  }

  unref() {
    this.refCount -= 1

    if (this.refCount > 0)
      return
    if (this.refCount < 0)
      throw new Error('invalid unref')

    if (this.autoClose) {
      fs.close(this.fd, (err) => {
        if (err)
          this.emit('error', err)

        else
          this.emit('close')
      })
    }
  }
}

class ReadStream extends Readable {
  start = 0
  endOffset = 0
  pos = 0

  constructor(readonly context: FdSlicer, options: any = {}) {
    super(options)

    this.context.ref()

    this.start = options.start ?? 0
    this.endOffset = options.end ?? 0
    this.pos = this.start
    this.destroyed = false
  }

  _read(n: number) {
    if (this.destroyed)
      return

    // @ts-expect-error _readableState
    let toRead = Math.min(this._readableState.highWaterMark, n)
    if (this.endOffset != null)
      toRead = Math.min(toRead, this.endOffset - this.pos)

    if (toRead <= 0) {
      this.destroyed = true
      this.push(null)
      this.context.unref()
      return
    }
    this.context.pend.go((cb) => {
      if (this.destroyed)
        return cb()
      const buffer = Buffer.alloc(toRead)
      fs.read(this.context.fd, buffer, 0, toRead, this.pos, (err, bytesRead) => {
        if (err) {
          this.destroy(err)
        }
        else if (bytesRead === 0) {
          this.destroyed = true
          this.push(null)
          this.context.unref()
        }
        else {
          this.pos += bytesRead
          this.push(buffer.slice(0, bytesRead))
        }
        cb()
      })
    })
  }

  override destroy(err?: Error | undefined) {
    if (this.destroyed)
      return this
    err = err || new Error('stream destroyed')
    this.destroyed = true
    this.emit('error', err)
    this.context.unref()
    return this
  }
}

class WriteStream extends Writable {
  start = 0
  endOffset = 0
  bytesWritten = 0
  pos = this.start

  constructor(readonly context: FdSlicer, options: any = {}) {
    super(options)

    this.context.ref()
    this.start = options.start || 0
    this.endOffset = (options.end == null) ? Number.POSITIVE_INFINITY : +options.end
    this.bytesWritten = 0
    this.pos = this.start
    this.destroyed = false

    this.on('finish', this.destroy.bind(this))
  }

  _write(buffer: Buffer, _encoding: any, callback: any) {
    if (this.destroyed)
      return

    if (this.pos + buffer.length > this.endOffset) {
      const err = new Error('maximum file length exceeded')
      // @ts-expect-error error code
      err.code = 'ETOOBIG'
      this.destroy()
      callback(err)
      return
    }
    this.context.pend.go((cb: any) => {
      if (this.destroyed)
        return cb()
      fs.write(this.context.fd, buffer, 0, buffer.length, this.pos, (err, bytes) => {
        if (err) {
          this.destroy()
          cb()
          callback(err)
        }
        else {
          this.bytesWritten += bytes
          this.pos += bytes
          this.emit('progress')
          cb()
          callback()
        }
      })
    })
  }

  destroy() {
    if (this.destroyed)
      return this
    this.destroyed = true
    this.context.unref()
    return this
  }
}

function createFromFd(fd: number, options?: any) {
  return new FdSlicer(fd, options)
}

function validateFileName(fileName: string) {
  if (fileName.includes('\\'))
    return `invalid characters in fileName: ${fileName}`

  if (/^[a-zA-Z]:/.test(fileName) || /^\//.test(fileName))
    return `absolute path: ${fileName}`

  if (fileName.split('/').includes('..'))
    return `invalid relative path: ${fileName}`

  // all good
  return null
}

function dosDateTimeToDate(date: number, time: number) {
  const day = date & 0x1F // 1-31
  const month = (date >> 5 & 0xF) - 1 // 1-12, 0-11
  const year = (date >> 9 & 0x7F) + 1980 // 0-128, 1980-2108

  const millisecond = 0
  const second = (time & 0x1F) * 2 // 0-29, 0-58 (even numbers)
  const minute = time >> 5 & 0x3F // 0-59
  const hour = time >> 11 & 0x1F // 0-23

  return new Date(year, month, day, hour, minute, second, millisecond)
}

function readUInt64LE(source: Buffer, offset: number) {
  // there is no native function for this, because we can't actually store 64-bit integers precisely.
  // after 53 bits, JavaScript's Number type (IEEE 754 double) can't store individual integers anymore.
  // but since 53 bits is a whole lot more than 32 bits, we do our best anyway.
  const lower32 = source.readUInt32LE(offset)
  const upper32 = source.readUInt32LE(offset + 4)
  // we can't use bitshifting here, because JavaScript bitshifting only works on 32-bit integers.
  return upper32 * 0x100000000 + lower32
  // as long as we're bounds checking the result of this function against the total file size,
  // we'll catch any overflow errors, because we already made sure the total file size was within reason.
}

function decodeBuffer(buffer: Buffer, start: number, end: number, isUtf8: boolean) {
  if (isUtf8) {
    return buffer.toString('utf8', start, end)
  }
  else {
    let result = ''
    for (let i = start; i < end; i++)
      result += cp437[buffer[i]]

    return result
  }
}
