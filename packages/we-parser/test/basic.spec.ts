import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { WEParser } from '../src/index'

describe('basic', () => {
  it('v3', () => {
    const parser = new WEParser()
    parser.parse(join(__dirname, './fixtures/2862745478/scene.pkg'))
    expect(parser.validateHeader.bind(parser), 'validate header').not.toThrowError()

    parser.loadFiles()

    expect(parser.files.length, 'files count should be greater than 0').greaterThan(0)
    expect(parser.packages.length, 'packages count should be greater than 0').greaterThan(0)
    expect(parser.files.length === parser.packages.length, 'files and packages count should be equal').toBeTruthy()
  })
})
