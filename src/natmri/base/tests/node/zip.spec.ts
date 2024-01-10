import fs, { promises as fsp } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Buffer } from 'node:buffer'
import { afterAll, beforeAll, expect, it, suite } from 'vitest'
import { createCancelablePromise } from 'natmri/base/common/async'
import type { IFile } from 'natmri/base/node/zip'
import { extract, pack } from 'natmri/base/node/zip'

let testDir: string
const pathChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

function getRandomTestPath(tmpdir: string, ...segments: string[]) {
  const parent = path.join(tmpdir, ...segments)
  const randomLength = 8
  let suffix = ''
  for (let i = 0; i < randomLength; i++)
    suffix += pathChars.charAt(Math.floor(Math.random() * pathChars.length))

  const randomFileName: string = suffix

  if (parent)
    return path.join(parent, randomFileName)

  return randomFileName
}

beforeAll(() => {
  testDir = getRandomTestPath(tmpdir(), 'natmri', 'zip')

  return fsp.mkdir(testDir, { recursive: true }) as Promise<void>
})

afterAll(() => {
  return fsp.rm(testDir, { recursive: true, force: true })
})

suite('Zip', () => {
  it('pack', async () => {
    const files: IFile[] = [
      {
        path: './extension.txt',
        contents: Buffer.from('Natmri test file!'),
      },
    ]

    const fixture = path.join(testDir, 'extract.zip')

    await pack(fixture, files)

    const doesExist = fs.existsSync(fixture)
    expect(doesExist).toBeTruthy()
  })

  it('extract should handle directories', async () => {
    const fixtures = path.join(__dirname, './fixtures')
    const fixture = path.join(fixtures, 'extract.zip')

    await createCancelablePromise(token => extract(fixture, testDir, {}, token))
    const doesExist = fs.existsSync(path.join(testDir, 'extension'))
    expect(doesExist).toBeTruthy()
  })
})
