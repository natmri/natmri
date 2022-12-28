import fs, { promises as fsp } from 'fs'
import { tmpdir } from 'os'
import path from 'node:path'
import { afterAll, beforeAll, expect, suite, test } from 'vitest'
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

afterAll(() => {
  return fsp.rm(testDir, { recursive: true, force: true })
})

beforeAll(() => {
  testDir = getRandomTestPath(tmpdir(), 'natmri', 'zip')

  return fsp.mkdir(testDir, { recursive: true }) as Promise<void>
})

suite('Zip', () => {
  test('pack', async () => {
    const files: IFile[] = [
      {
        path: './extension.txt',
        contents: Buffer.from('Natmri test file!'),
      },
    ]

    const fixtures = path.join(__dirname, './fixtures')
    const fixture = path.join(fixtures, 'extract1.zip')

    await pack(fixture, files)

    const doesExist = fs.existsSync(fixture)
    expect(doesExist).toBeTruthy()
    if (doesExist)
      await fsp.rm(fixture, { force: true, recursive: true })
  })

  test('extract should handle directories', async () => {
    const fixtures = path.join(__dirname, './fixtures')
    const fixture = path.join(fixtures, 'extract.zip')

    await createCancelablePromise(token => extract(fixture, testDir, {}, token))
    const doesExist = fs.existsSync(path.join(testDir, 'extension'))
    expect(doesExist).toBeTruthy()
  })
})
